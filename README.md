# Projectdroid

Projectdroid is a professional project management dashboard designed as an Online Progressive Web App (PWA). It features comprehensive tools for managing customers, projects, teams, time logging, and financial administration. The application uses a React frontend powered by Vite and PocketBase for backend data storage and retrieval.

## Features

- **Project Management:** Track projects through various statuses (Proposal, Approved, On Hold, Active, Completed).
- **Customer Management:** Manage customer details and hourly rates.
- **Team Management:** User roles (Admin/User) with detailed profile settings.
- **Time Logging:** Track time spent on tasks and projects.
- **Financial Administration:** Manage project budgets, invoices, and expenses.
- **PWA Support:** Can be installed as a Progressive Web App for desktop and mobile use.

## Run Locally

**Prerequisites:** Node.js, npm

1. Install dependencies:
   `npm install`
2. Start the development server:
   `npm run dev`

> **Note on Environments:** By default, the application connects to the development database (`https://db-dev.projectdroid.nl`). This can be overridden by creating a `.env` file based on `.env.example`. For production, you should use `https://db.projectdroid.nl`.

## Setup PocketBase

To setup PocketBase collections locally or on your server, you can use the provided script:
`node scripts/setup-pocketbase.js <admin-email> <admin-password>`
To import mock/existing data from `data.json`:
`node scripts/import-data.js <admin-email> <admin-password>`

## Build

To build the application for production:
`npm run build`
