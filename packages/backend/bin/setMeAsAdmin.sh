#!/bin/sh
npx wrangler d1 execute DB --command "UPDATE users SET is_admin = 1 WHERE email = 'kopertop@gmail.com';"
