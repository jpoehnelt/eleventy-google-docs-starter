# Eleventy and Google Docs Starter

This Eleventy starter combines the [Google Docs API](https://developers.google.com/docs/api), [Eleventy](https://11ty.dev), and [@googleworkspace/google-docs-hast](https://www.npmjs.com/package/@googleworkspace/google-docs-hast) to create pages using Google Docs and Google Drive as a CMS.

[Demo](https://eleventy-google-docs-starter.netlify.app)

## Setup

1. Copy `.env.sample` to `.env`.
2. Create a [Google Cloud project](https://console.cloud.google.com) and enable the [Google Docs API](https://developers.google.com/docs/api).
3. Create a [service account](https://console.cloud.google.com/iam-admin/serviceaccounts) and download the JSON credentials file.
4. Copy the `client_email` and `client_private_key` value from the JSON credentials file to the variables in `.env`.
5. Create a Google Drive folder and share it with the service account email.
6. Copy the folder ID to the `GOOGLE_DRIVE_FOLDER` variable in `.env`.
7. Run `npm install` to install dependencies.
8. Run `npm run dev` to start the development server.
