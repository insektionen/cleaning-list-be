import nodemailer, { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { UsableUser } from '../server/user/user.model';

const { EMAIL_USERNAME, EMAIL_PASSWORD, FRONT_END_URL } = process.env;
let transporter: Transporter<SMTPTransport.SentMessageInfo>;

export function connectTransporter() {
	if (transporter) return;
	transporter = nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: EMAIL_USERNAME,
			pass: EMAIL_PASSWORD,
		},
	});
}

export async function sendEmail(user: UsableUser, token: string) {
	connectTransporter();

	if (!user.email) return;
	const url = `${FRONT_END_URL}/password-reset?token=${token}`;
	await transporter.sendMail({
		from: `Cleaning List Password Recovery <${EMAIL_USERNAME}>`,
		to: user.email,
		subject: 'Password recovery',
		html: `
			<html>
				<head>
					<style>
						* {
							text-align: center;
						}
						b {
							font-size: 1.4em;
						}
					</style>
				</head>
				<body>
					<h1>Password Recovery</h1>
					<p>
						A request to reset your password has been sent. If this wasn't you, you don't have to do 
						anything. If this happens multiple times you should consider changing your password as it's
						possible someone is trying to gain access to your account.
					</p>
					<p>If you were the one who asked to change password you can find the token here:</p>
					<p><b>${token}</b></p>
					<p>Or click on this link: <a href="${url}">${url}</a></p>
				</body>
			</html>
		`,
	});
}
