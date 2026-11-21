# Comment translation

The review collector translates non-English customer comments into English with the
[`google-translate-api-x`](https://www.npmjs.com/package/google-translate-api-x) package. It calls
Google Translate's public web endpoint, so **no API key, account or extra service is needed**. It is
installed with the rest of the dependencies:

```powershell
npm install
npm run start:server
```

## Check it

```powershell
$body = @{ text = "Hola, la transferencia llegó tarde" } | ConvertTo-Json -Compress
Invoke-RestMethod http://localhost:3001/api/translate -Method Post -ContentType "application/json" -Body $body
```

The response contains `translatedText` (English) and `detectedSourceLanguage` (for example `es`).

## Limits to know about

- The package uses an **unofficial** endpoint. Google can rate-limit or change it without notice; when
  that happens the app shows "Translation is temporarily unavailable" and the original comment stays visible.
- The server protects the endpoint with a per-client limit (10 per minute), a global limit (100 per
  minute), a 5,000 character cap per comment, a 24 hour cache and a 20 second timeout.
- Comment text is sent to Google. Use the official Cloud Translation API with a key if you need
  contractual guarantees for production or sensitive data.
