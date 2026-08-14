# Production Deployment Runbook

## 1. 目的

このRunbookは、Task Management ApplicationのProduction環境における以下の運用手順を定義します。

- デプロイ
- Database migration
- Production設定確認
- Health check
- Production smoke test
- Backup
- Restore
- Rollback
- 障害時対応

現時点では、Production用のhosting providerおよびPostgreSQL providerは未選定です。

provider固有のコマンド、URL、resource名、credential等は、Production platform決定後に追記します。

本Runbookでは、providerに依存しないProduction運用上の基本契約を定義します。

---

## 2. Deployment architecture

Production architectureは以下とします。

```text
Internet
  ↓
TLS termination / trusted reverse proxy または load balancer
  ↓
Next.js standalone application container
  ↓
Managed PostgreSQL または external PostgreSQL
```

アプリケーションは、immutable（不変）なDocker imageとしてデプロイします。

Productionのapplication containerは、port `3000` をインターネットへ直接公開してはいけません。

Reverse proxyまたはload balancerを、Production環境におけるtrusted network boundaryとします。

ローカルの `compose.yaml` に定義されているPostgreSQL serviceは、local developmentおよびtest専用です。

Production database architectureとしては使用しません。

---

## 3. Production artifact

Production releaseでは、GitHub Container Registry（GHCR）へpublishされたDocker imageを使用します。

Registry:

```text
ghcr.io
```

Image repository:

```text
ghcr.io/satochrono/task-management-app
```

Production deploymentの識別には、Git commit SHAに基づくimmutableなimage tagを使用します。

```text
sha-<full-git-commit-sha>
```

例:

```text
ghcr.io/satochrono/task-management-app:sha-<full-git-commit-sha>
```

`latest` やその他のmutableなtagを、正式なdeployment identityまたはrollback identityとして使用してはいけません。

Production releaseごとに、実際にdeployしたimage SHAを必ず記録します。

---

## 4. Production GitHub Environment

Production環境を変更する処理は、GitHub Environmentの以下を使用します。

```text
production
```

現在のprotection policy:

```text
Required reviewer: satochrono
Prevent self-review: OFF
Administrator bypass: OFF
Allowed deployment branch: main only
```

GHCRへimmutableなDocker imageをpublishする処理自体はProduction環境を変更しないため、Production approvalの対象にはしません。

Production approvalは、以下のようなProduction環境を変更する処理の前に必要です。

- Production database migration
- Application deployment
- Production infrastructure変更

---

## 5. Production configuration contract

### 5.1 Runtime configuration

Application containerでは、以下の環境変数を使用します。

```text
NODE_ENV=production
DATABASE_URL=<production runtime database URL>
AUTH_SECRET=<production random secret, at least 32 characters>
AUTH_TRUST_HOST=true
```

`DATABASE_URL` は、実行中のapplicationからPostgreSQLへ接続するために使用します。

Production runtime用database accountには、実行中のapplicationが必要とする最小限の権限のみを付与することを推奨します。

### 5.2 Migration configuration

Migration jobでは、以下を使用します。

```text
MIGRATION_DATABASE_URL=<production migration database URL>
```

`MIGRATION_DATABASE_URL` は、Prisma CLIによるmigration操作専用です。

Migration用database accountは、runtime用database accountより広いschema変更権限を必要とする場合があります。

選定したplatformの仕様上避けられない場合を除き、`MIGRATION_DATABASE_URL` をapplication containerへ渡してはいけません。

### 5.3 Secret storage

実Production secretは、以下へ保存してはいけません。

- Git
- Dockerfile
- Docker image
- commit対象の `.env`
- README
- Runbook内の実値
- CI log
- Application log

Production secretは、選定したdeployment platformのsecret storeを使用します。

GitHub ActionsからProduction migrationまたはdeploymentを実行する場合、可能であれば通常のRepository Secretsではなく、GitHub `production` Environment Secretsを使用します。

commit対象の `.env.production.example` にはplaceholderのみを記載します。

Production release前には、以下を実行してProduction configurationを検証します。

```text
pnpm env:validate:production
```

placeholderが残っているProduction configurationは拒否されなければなりません。

---

## 6. Database connection policy

Applicationは、Prismaおよび `@prisma/adapter-pg` を介してPostgreSQLへ接続します。

RuntimeのPrisma Clientはprocess単位で保持します。

PostgreSQL adapterでは、現在以下を設定しています。

```text
connectionTimeoutMillis = 5000
```

Production databaseのconnection budgetを計算する前に、connection pool sizeを安易に増加させてはいけません。

複数のapplication instanceを使用する場合、概念的な最大connection数は以下です。

```text
Application全体の最大DB connection数
=
Application instanceあたりの最大connection数
×
Application instance数
```

この値は、database providerが安全に扱えるconnection budget以内に収めます。

さらに、以下のための余裕を残す必要があります。

- Migration job
- Administrative access
- Backup / maintenance tool
- Database provider内部処理

Production database providerが、

- Runtime用pooled endpoint
- Migration用direct endpoint

を提供する場合は、原則として以下を使用します。

```text
DATABASE_URL
→ pooled runtime endpoint

MIGRATION_DATABASE_URL
→ direct migration endpoint
```

ただし、providerの公式仕様に別の指定がある場合は、その仕様を優先します。

---

## 7. Prisma migration policy

Production schema変更には以下を使用します。

```text
pnpm db:deploy
```

内部では以下が実行されます。

```text
prisma migrate deploy
```

Migration status確認には以下を使用します。

```text
pnpm db:status
```

### 7.1 Application startupでmigrationを実行しない

Application containerのstartup commandにmigration処理を含めてはいけません。

Application startupは以下を維持します。

```text
node server.js
```

以下のような構成へ変更してはいけません。

```text
prisma migrate deploy && node server.js
```

Database migrationとapplication startupは、別々のrelease operationとして扱います。

### 7.2 適用済みmigrationは変更しない

Productionへ適用済みのmigration fileを編集してはいけません。

Production利用開始後に、commit済みmigration historyを書き換えてはいけません。

Schema修正が必要な場合は、新しいmigrationとして追加します。

### 7.3 Productionで禁止するPrisma operation

通常のProduction運用では、以下を使用してはいけません。

```text
prisma migrate reset
prisma db push
```

通常deploymentの一部として、Production databaseを手動でdropして再作成してはいけません。

---

## 8. Initial production database deployment

初回Production deploymentでは、新しい空のPostgreSQL databaseを使用します。

commit済みのPrisma migration historyを、先頭から順番にすべて適用します。

現在のmigration history:

```text
20260808004333_init
20260809060845_add_user_authentication
20260810080654_add_task_ownership_nullable
20260810195154_require_task_owner
```

このmigration historyは、PostgreSQL 18.4の一時的な空databaseに対して適用確認済みです。

確認済み事項:

- すべてのcommit済みmigrationが正常に適用できた
- `pnpm db:status` でdatabaseがcurrent状態になった
- `tasks.owner_id` が `NOT NULL` になった
- 想定したtableが作成された
- `_prisma_migrations` の全migration recordが完了状態になった

初回Production databaseはmigration実行前に空であるため、既存Taskに対するownership backfillは不要です。

---

## 9. Standard release sequence

Production releaseは以下の順序で実施します。

```text
1. Pull Requestのquality checkがすべて成功
2. mainへmerge
3. 対象main commitのCIが成功
4. Immutable Docker imageをbuild
5. Exact commit SHA tagでGHCRへpush
6. Production deployment approvalを取得
7. Backup / recovery readinessを確認
8. Production migration configurationを検証
9. Database migration jobを実行
10. Migration statusを確認
11. Application imageをdeploy
12. Livenessを確認
13. Readinessを確認
14. Production smoke testを実施
15. Release完了と判定
```

必要なmigrationが正常完了する前に、新application versionをrolloutしてはいけません。

---

## 10. Pre-release checklist

Migrationまたはdeployment開始前に、以下を確認します。

```text
Exact Git commit SHA:
Exact Docker image tag:
CI status:
Production approval:
Production configuration validation:
Database backup / recovery point:
Migration database connectivity:
Current migration status:
Rollback-compatible previous image:
Maintenance / write-control requirement:
```

初回Production deploymentでは、rollback可能な以前のProduction imageは存在しません。

Production traffic開始前の初回deployment失敗は、rollbackではなくabort-and-fixとして扱います。

---

## 11. Migration procedure

Migration前に以下を確認します。

1. Release対象のexact Git commit SHAを確認する
2. 対応するimmutable GHCR imageが存在することを確認する
3. Production approvalを確認する
4. Backupまたはrecovery point readinessを確認する
5. Production configurationをvalidationする
6. `MIGRATION_DATABASE_URL` が意図したProduction databaseを指していることを確認する

Migration前に以下を実行します。

```text
pnpm db:status
```

Pending migrationの状態を確認します。

続いて以下を実行します。

```text
pnpm db:deploy
```

正常終了後、再度以下を実行します。

```text
pnpm db:status
```

Migrationが失敗した場合、またはmigration statusが想定と異なる場合は、applicationをdeployしてはいけません。

---

## 12. Migration failure handling

Application rollout前にmigrationが失敗した場合は、以下の順に対応します。

1. Application rolloutを停止する
2. `pnpm db:status` を確認する
3. 失敗したexact migrationを特定する
4. Migrationがdatabaseを部分的に変更していないか確認する
5. Recovery方法を明示的に決定する

実際にfailed migrationが存在し、そのmigrationをrevertして再実行する場合には、状況に応じて以下を使用できます。

```text
prisma migrate resolve --rolled-back <failed-migration-name>
```

Migration内容を手動で完了させ、Prisma上もappliedとして記録する場合は以下を使用できます。

```text
prisma migrate resolve --applied <failed-migration-name>
```

これらのコマンドは、実際のdatabase stateを確認してから使用します。

以下を、成功済みmigrationに対するgeneric rollback mechanismとして使用してはいけません。

```text
prisma migrate resolve --rolled-back
```

成功済みschema変更を元に戻す必要がある場合は、必要なschemaへ戻すための新しいmigrationを作成します。

---

## 13. Health endpoints

### 13.1 Liveness

Endpoint:

```text
GET /api/health/live
```

正常時:

```text
HTTP 200
{"status":"ok"}
```

Livenessはdatabase connectionに依存してはいけません。

Docker imageの `HEALTHCHECK` はこのendpointを使用します。

Database connection障害だけを理由にapplication process自体をdeadと判定してはいけません。

### 13.2 Readiness

Endpoint:

```text
GET /api/health
```

正常時:

```text
HTTP 200
{"status":"ok","database":"ok"}
```

Readinessはdatabase connectivityに依存します。

Readinessに失敗しているapplication instanceへProduction trafficを流してはいけません。

---

## 14. Reverse proxy requirements

Applicationは、trusted reverse proxyまたはload balancerの背後で稼働させます。

Proxyは、applicationおよびauthentication layerが必要とする外部request情報を正しくforwardする必要があります。

最低限、以下を正しく扱います。

```text
Host
X-Forwarded-Host
X-Forwarded-Proto
```

外部から見えるProduction schemeはHTTPSでなければなりません。

以下のようなapplication container内部addressが、外部向けauthentication callback URLへ現れてはいけません。

```text
0.0.0.0:3000
localhost
127.0.0.1
```

Production deployment後には、authentication redirectが以下の形式になっていることを確認します。

```text
https://<production-host>/...
```

Application port `3000` は、インターネットへ直接公開してはいけません。

---

## 15. HTTPS / HSTS

TLS terminationは、Production reverse proxyまたはhosting platform側の責務とします。

HTTP requestはHTTPSへredirectします。

Production HTTPS responseには以下が存在することを確認します。

```text
Strict-Transport-Security
```

HSTSはapplication側では設定しません。

Final production domain構成および運用影響を確認するまでは、以下を安易に有効化しません。

```text
preload
includeSubDomains
```

---

## 16. Content Security Policy

ApplicationはProduction環境でContent Security Policyを返します。

Production CSPには以下が含まれていてはいけません。

```text
'unsafe-eval'
```

現在のbaselineでは、互換性確保のため以下を許可しています。

```text
'unsafe-inline'
```

対象は現在の `script-src` および `style-src` です。

より厳格なnonce-based CSPは、将来のhardeningとして検討できます。

Deployment後にはbuild configurationだけを信用せず、実Production response headerを直接確認します。

また、以下のheaderが存在しないことを確認します。

```text
X-Powered-By
```

---

## 17. Production logging

Application server logは、structured JSONとしてstdout / stderrへ出力します。

Production platform側で以下を担当します。

- Log collection
- Retention
- Search
- Alert integration
- Infrastructure-level rotation

ApplicationはProduction container filesystemへlog fileを書き込みません。

### 17.1 Sensitive data

以下をlogへ出力してはいけません。

- Password
- Authentication secret
- Authorization header
- Cookie
- Token
- CSRF value
- Database URL
- Raw credential

Shared loggerは、既知のsensitive field名をredactします。

ただし、generic loggerへ実際の `Error` objectを渡した場合、`Error.message` は保持されます。

そのため、Production call siteでは、安全性を確認していないraw `Error` objectをloggerへ渡してはいけません。

以下のようなallow-listed metadataを使用します。

```text
errorName
digest
requestId
userId
role
routePath
```

現在のProduction server call siteはこの方針に従っています。

### 17.2 Request correlation

Application request contextで `requestId` が利用できる場合は使用します。

すべてのNext.js framework-level errorにapplication側requestIdが存在するとは限りません。

`onRequestError` によるframework logは、application request contextと必ずしもcorrelationできるとは限りません。

---

## 18. Backup policy

Production database provider決定後は、providerが提供するautomated backupおよびPoint-in-Time Recovery（PITR）をPrimary recovery mechanismとします。

Production dataへ影響する可能性のあるmigration前には、以下を確認します。

1. BackupまたはPITRが有効であること
2. 最新recovery pointが許容できる状態であること
3. Recovery procedureが文書化されていること
4. Restore testが定期的に実施されていること

PostgreSQL logical dumpは、secondary portability / recovery mechanismとして扱います。

Logical dumpだけをProduction backupの唯一の手段としてはいけません。

Logical backup例:

```text
pg_dump -Fc
```

Application-owned databaseをrestoreする際の代表的なoption:

```text
pg_restore --no-owner --no-privileges
```

Provider固有のbackup / restore commandは、Production provider決定後に追記します。

---

## 19. Restore verification

PostgreSQL 18.4を使用したlocal restore drillは実施済みです。

確認済み事項:

- Custom-format `pg_dump` が正常完了
- 別のrestore用databaseを作成
- `pg_restore --no-owner --no-privileges` が正常完了
- `_prisma_migrations`、`tasks`、`users` がrestoreされた
- 4件のmigration recordが存在し、すべて完了状態だった
- Sourceとrestore先の `users` row countが一致
- Sourceとrestore先の `tasks` row countが一致

このdrillでは、row-by-rowのexact content比較までは実施していません。

したがって、この確認を「restore後の全row内容が完全一致した」と表現してはいけません。

将来のProduction restore drillでは、Production要件に応じたdata integrity verification criteriaを別途定義します。

---

## 20. Application rollback

Application rollbackでは、過去のimmutable GHCR image tagを使用します。

例:

```text
Current:
ghcr.io/satochrono/task-management-app:sha-<current-sha>

Rollback:
ghcr.io/satochrono/task-management-app:sha-<previous-known-good-sha>
```

Rollbackは、現在のdatabase schemaが以前のapplication imageと互換性を持つ場合にのみ実施できます。

Rollback前には以下を確認します。

- Previous image identity
- Current database migration state
- Schema compatibility
- Runtime configuration compatibility

Database migration実施後に、application imageだけを常にrollbackできるとは限りません。

---

## 21. Schema rollback strategy

Production databaseのrollbackは、自動down migrationを基本方針としません。

推奨するschema変更手順:

```text
expand
→ compatible applicationをdeploy
→ verify
→ 後からcontract
```

可能な限り、application rollback可能期間を維持するschema migration strategyを採用します。

成功済みschema migrationで問題が発生した場合は、成功済みmigrationを「なかったこと」にするのではなく、forward-fix migrationを優先します。

元のapplied migration fileは変更しません。

---

## 22. Data corruption / destructive migration recovery

Production data corruption、またはdestructive migrationによるrecoveryが必要な場合は、以下の順に対応します。

1. Writeを停止または制限する
2. 利用可能であればmaintenance modeへ移行する
3. 必要なrecovery pointを決定する
4. Managed PITRまたはverified backup restoreを実行する
5. Database consistencyを確認する
6. Restore後schemaと互換性のあるapplication imageをdeployする
7. Livenessを確認する
8. Readinessを確認する
9. Production smoke testを実施する
10. Normal trafficを再開する

過去時点へのrestoreでは、incident発生時刻とrecovery pointの間のdataが失われる可能性があります。

RPOおよびRTOは、Production database providerとbusiness requirement確定後に定義します。

---

## 23. Production smoke test

Deployment直後、実Production URLに対して以下を実施します。

### 23.1 Liveness

Request:

```text
GET https://<production-host>/api/health/live
```

期待:

```text
HTTP 200
{"status":"ok"}
```

### 23.2 Readiness

Request:

```text
GET https://<production-host>/api/health
```

期待:

```text
HTTP 200
{"status":"ok","database":"ok"}
```

### 23.3 HTTPS redirect

Request:

```text
http://<production-host>
```

期待:

```text
301 または 308
→ HTTPSへredirect
```

### 23.4 HSTS

HTTPS responseに以下が存在することを確認します。

```text
Strict-Transport-Security
```

### 23.5 CSP

以下が存在することを確認します。

```text
Content-Security-Policy
```

Production policyに以下が含まれていないことを確認します。

```text
'unsafe-eval'
```

### 23.6 Server disclosure

以下が存在しないことを確認します。

```text
X-Powered-By
```

### 23.7 Authentication redirect

未認証状態で以下へアクセスします。

```text
/tasks
```

以下へredirectされることを確認します。

```text
/login
```

Callback URLが外部HTTPS Production hostを使用していることを確認します。

以下のような内部addressがcallback URLへ現れてはいけません。

```text
0.0.0.0
localhost
127.0.0.1
container internal port
```

### 23.8 Authentication flow

承認済みProduction smoke-test accountを使用し、以下を確認します。

1. Login
2. `/tasks` 表示
3. Logout
4. 再度 `/tasks` へアクセス
5. 再認証が要求されること

### 23.9 Task CRUD

Smoke-test用dataを使って以下を確認します。

```text
create
read
update
delete
```

確認後、smoke-test dataは削除します。

### 23.10 Authorization

代表的なauthorization behaviorを確認します。

- USERは他userのtaskへアクセスできない
- ADMIN behaviorが承認済みauthorization policyと一致する

### 23.11 Logs

Production log collectionへstructured JSON eventが送られていることを確認します。

確認対象logに以下が含まれていないことを確認します。

- Credential
- Secret
- Token
- Cookie
- Database URL
- Password

---

## 24. First production deployment

初回Production releaseは、既存Production applicationおよびbusiness dataが存在しないため、通常releaseと扱いが異なります。

初回手順:

```text
1. Production PostgreSQLをprovision
2. Backup / PITRを有効化
3. Runtime DB identity / Migration DB identityを構成
4. Production secretを設定
5. Production configurationをvalidate
6. 意図した新規空Production databaseであることを確認
7. 全commit済みPrisma migrationを実行
8. Migration statusを確認
9. Exact immutable application imageをdeploy
10. Liveness確認
11. Readiness確認
12. Production smoke testを完全実施
13. Normal production trafficを開始
14. Deployed image SHAとmigration stateを記録
```

Normal traffic開始前に初回deploymentが失敗した場合は、user-generated Production dataがまだ存在しないため、releaseをabortして修正できます。

Production traffic開始後は、通常のProduction backup / rollback / recovery ruleを適用します。

---

## 25. Release failure matrix

### 25.1 CI failure

対応:

```text
Releaseをpublish / deployしない。
Codeを修正してCIを再実行する。
```

### 25.2 Docker image publication failure

対応:

```text
Deployしない。
Image publicationを修正する。
Exact commit identityを維持する。
```

### 25.3 Production configuration validation failure

対応:

```text
Migration / deploymentを実行しない。
Secretを露出させずにProduction configurationを修正する。
```

### 25.4 Backup readiness failure

対応:

```text
Risky migrationを実行しない。
Backup / PITR readinessを復旧させてから進める。
```

### 25.5 Migration failure

対応:

```text
Deploymentを停止する。
Migration stateを確認する。
Failed migrationを明示的にrepairする。
New application versionを起動しない。
```

### 25.6 Application deployment failure before traffic

対応:

```text
互換性のあるprevious Production imageが存在する場合:
previous imageをredeployする。

初回Production deploymentの場合:
releaseをabortして修正する。
```

### 25.7 Readiness failure

対応:

```text
Failing instanceへProduction trafficを流さない。
Database connectivityとruntime configurationを調査する。
```

### 25.8 Smoke-test failure

対応:

```text
Release完了と判定しない。
Application rollback、forward-fix、database recoveryのどれが必要か判断する。
```

---

## 26. Prohibited production operations

通常のProduction運用では、以下を禁止します。

```text
prisma migrate reset
prisma db push
applied migrationの編集
Production migration historyの削除
Application startup時の自動migration
成功済みmigrationを無条件でrolled-back扱いにすること
Production databaseの手動drop-and-recreate
Mutable image tagをrollback identityとして使用すること
Production secretをcommitすること
Production secretをlogへ出力すること
Application port 3000をインターネットへ直接公開すること
```

Destructive database operationを例外的に実施する場合は、明示的なincident / recovery planを用意します。

---

## 27. Production provider決定後に追記する情報

以下は、Production platform決定まで意図的に未確定とします。

```text
Production application provider:
Production PostgreSQL provider:
Production region:
Production DNS name:
Production HTTPS URL:
Reverse proxy / load balancer:
Container registry deployment integration:
Production application service name:
Production database host:
Runtime database role:
Migration database role:
Connection pool limit:
Maximum application instances:
Database connection budget:
Backup retention:
PITR retention:
RPO:
RTO:
Log aggregation platform:
Alerting platform:
Infrastructure deployment command:
Migration job command:
Application deployment command:
Rollback command:
Maintenance-mode procedure:
```

Provider固有手順を追加する際も、本Runbookで定義したpolicyを維持します。

---

## 28. Release record

Production releaseごとに最低限以下を記録します。

```text
Deployment date/time:
Git commit SHA:
GHCR image:
Previous image:
Applied Prisma migrations:
Production approval:
Backup / recovery point:
Migration result:
Liveness result:
Readiness result:
Smoke-test result:
Rollback required:
Operator:
Notes:
```

Migration state、application health、Production smoke testの結果が記録されるまで、release完了とは判定しません。
