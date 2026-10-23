# KMT Cricket Stadium

Production React app for one cricket stadium. Tournament and registration data is served from Firebase Authentication and Cloud Firestore. The app has no demo account or sample-data fallback; it requires Firebase configuration to render.

## Local development

Copy `.env.example` to `.env` and fill in the Firebase Web App configuration. Set `VITE_ADMIN_EMAILS` to comma-separated, lowercase email addresses. Those accounts must use a verified email, and the same addresses must be present in `firestore.rules`.

```sh
npm ci
npm run dev
```

If required Firebase settings are missing, the app displays which environment values need configuration.

## Firebase project

This workspace targets `kmt-stadium-reg-20261023` in `.firebaserc`.
The production Hosting site is `https://kmtstadium.web.app`.

1. Enable Google and Email/Password providers in Firebase Authentication. Email/Password users need to verify their email to claim guest entries.
2. Create the default Firestore database. The app uses Firestore only; it does not use Cloud Storage.
3. Keep the admin emails in sync between `VITE_ADMIN_EMAILS` and the `isAdmin` allowlist in `firestore.rules`. Firestore rules are the authorization boundary.
4. Add tournament records from `/admin/tournaments`; no sample tournaments or registrations are seeded.
5. Build and deploy Hosting, Firestore rules, and indexes:

```sh
npm ci
npm run build
firebase deploy --project kmt-stadium-reg-20261023 --only hosting,firestore:rules,firestore:indexes
```

The Hosting rewrite supports React Router deep links. The `kmtstadium` Hosting target in `firebase.json` maps to the `kmtstadium` site in `.firebaserc`. Add `kmtstadium.web.app` to Authentication authorized domains if Firebase does not already list it. Firebase Web API settings are client identifiers, not server secrets. Do not place service account keys in this frontend project.

## Operational limits

- Payments are handled outside this app. Organizers manually verify UTRs and offline payment references.
- Guests register without accounts and can claim entries only after signing in with the same verified email. Phone numbers are contact details, not account ownership proof.
- Campaign QR codes and confirmation passes are generated in the browser. The app does not send email/SMS, accept uploads, use Cloud Storage, or authenticate by phone.
- Firestore rules and indexes are included. Rules tests use the Firebase emulator; Java must be installed to run `firebase emulators:exec`.

## Checks

`npm run build` produces the Firebase Hosting bundle. `npm test` runs domain tests and runs Firestore rules tests when `FIRESTORE_EMULATOR_HOST` points to a running emulator.
