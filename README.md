# Cleaning list Backend

This is the backend for the Cleaning List Webapp (v2).

## Running locally

**Note:** All commands are written to work on \*nix systems, everything should work on Windows as well but some commands may need to be altered, e.g. `cp .env.example .env` -> `copy .env.example .env`.

### Requirements

- Docker
- Node
- Yarn

### Steps

1. `yarn`, install dependencies
2. `yarn db:create`, create an image for the database
3. `yarn db:start`, start the container
4. `cp .env.example .env`, create an env file
5. `yarn migrate dev`, perform migrations
6. `yarn seed:users`, (optional) create sample users
7. `yarn dev`, start the development server

### Setting up email

In order to test email services, i.e. password reset, you must add email configuration the `.env` file. You can use any Gmail account for this. **Note:** this does not mean that it has to end with `@gmail.com`, it just has to be managed by the Gmail client.

<details>
<summary><code>EMAIL_USERNAME</code></summary>

Any email address connected to Google, e.g. `example@gmail.com` or `example@insektionen.se`.

</details>

<details>
<summary><code>EMAIL_PASSWORD</code></summary>

Gmail doesn't allow SMTP connections using users' regular passwords. Instead you have to set up an _App password_.

_App passwords_ can be found in a google account's settings in _Security_ under _Signing in to Google_. _2-Step Verification_ must be enabled in order for _App passwords_ to be available.

Select _Other_ under _Select app_ and give the password a name, e.g. `nodemailer` or `cleaning-list-be`.

</details>

#### **Example**

```sh
EMAIL_USERNAME="example@gmail.com"
EMAIL_PASSWORD="xlygfluhgrquikhc"
```

## Code style

Code style is maintained using prettier.

Commands:

- `yarn lint` to check styling, will only verify that styling is correct
- `yarn format` to fix styling, will find style errors and resolve them if possible

Code style is automatically checked by GitHub when work is pushed.

## Testing

Testing is performed using `jest`, `jest-when`, and `supertest`, with `faker` providing sample data.

`yarn test` is used to run the complete test suite, after making sure dependencies are installed.

Tests are automatically run by GitHub when work is pushed.

### Running the tests of only one file

If you wish to only run the tests of one file you can specify a pattern to select the file using `yarn test <pattern>`. Jest uses regex to pattern match for files, so the pattern doesn't need to be an exact filename, just unique enough to select only the file you want.

- `yarn test authentication` will run tests in `test/src/utils/authentication.test.ts`
- `yarn test server` will run tests in `test/src/server/user.routes.test.ts` and `test/src/server/list.routes.test.ts`
- `yarn test user.routes` will run tests in `test/src/server/user.routes.test.ts` (note that `yarn test user` would run all tests depending on the system if there's a `User` directory somewhere above where the project is located)

### Running only one describe block or specific tests

If you wish to run only describe block or test you can specify a pattern to select the describe block/test using `yarn test -t <pattern>`. Jest uses regex to pattern match for tests, so the pattern doesn't need to be the exact name, just unique enough to select only the describe block/test you want.
