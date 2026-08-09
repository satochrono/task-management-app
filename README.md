# Task Management Application

業務向けTask管理Webアプリケーションです。

## Runtime

- Windows 11
- PowerShell
- Node.js 24.19.0
- pnpm 11.20.0
- Next.js 16.2.12
- React 19.2.8
- TypeScript 5.9.3
- Prisma ORM 7.9.1
- PostgreSQL 18.4
- Docker Desktop with WSL 2 backend

## Package manager

pnpmのみを使用します。

npm、Yarn、Bunをプロジェクトのパッケージ管理には使用しません。

## Development environment policy

Node.js、pnpm、Git、VS CodeはWindowsネイティブ版を使用します。

WSL内のNode.js、pnpm、Gitとは混在させません。

WSL 2はDocker DesktopのLinux container backendとして使用します。

## Initial setup

### Node.js

```powershell
nvm use 24.19.0
```
