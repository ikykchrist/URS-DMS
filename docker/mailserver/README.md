# Self-hosted mail

This profile uses [docker-mailserver](https://github.com/docker-mailserver/docker-mailserver).
It is intentionally optional so the normal URS-DMS stack does not require an email server.

Before enabling it for external delivery:

1. Set `MAIL_DOMAIN` in `.env` to a domain you control.
2. Create the required DNS records (MX, SPF, DKIM, and DMARC).
3. Generate the mailbox and DKIM configuration with the docker-mailserver setup script.
4. Set the URS-DMS SMTP variables to the mailbox credentials:

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=mailserver
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@example.com
SMTP_PASS=replace-with-mailbox-password
SMTP_FROM=noreply@example.com
```

Start the optional server with `docker compose --profile mail up -d mailserver`.
