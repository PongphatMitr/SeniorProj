# Project Setup Guide

## Prerequisites

Before starting, ensure the following are installed on your machine:

- Node.js (v16 or higher)
- npm (Node Package Manager)
- PostgreSQL

## Installation Steps

1. Install core dependencies:

```bash
npm install express body-parser pg
```

2. Install a specific version of the PostgreSQL client:

```bash
npm install pg@8.11.3
```

3. Install the cron job scheduler:

```bash
npm install node-cron
```

4. Install Socket.IO for real-time features:

```bash
npm install socket.io
```

## Running the Project

Start the main server:

```bash
node server.js
```

## Project Structure (example)

```
project/
├── server.js
├── cron.js
├── tailwind.config.js
├── package.json
├── node_modules/
└── ...
```

## Notes

- Update environment configuration (`.env` or config files) for your PostgreSQL database connection if required.
- If Tailwind CSS is used in frontend files, additional build setup may be needed.
- Ensure all necessary scripts are correctly defined in `package.json`.
