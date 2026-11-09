# Local comment translation

The review collector sends comment text to a self-hosted LibreTranslate instance. LibreTranslate is open source and does not require an API key when self-hosted. Translation requests stay on the local machine in the default configuration.

## Start the translator

Install Docker Desktop, then start the service from the project root:

```powershell
docker compose up -d libretranslate
```

The first start downloads the translation models and may take several minutes. The service is bound to `127.0.0.1:5000` and is not exposed to the local network.

## Connect the review collector

Set `LIBRETRANSLATE_URL=http://127.0.0.1:5000` in the server `.env` file. This is the default when the variable is omitted. Start or restart the review collector:

```powershell
npm run review-server
```

Check that LibreTranslate is ready:

```powershell
Invoke-RestMethod http://localhost:5000/languages
```

Then test translation through the app backend:

```powershell
$body = @{ text = "Hola, la transferencia llegó tarde" } | ConvertTo-Json -Compress
Invoke-RestMethod http://localhost:3001/api/translate -Method Post -ContentType "application/json" -Body $body
```

The response contains the English translation and the detected source language. Other deployments can set `LIBRETRANSLATE_URL` to their private LibreTranslate host. Do not send customer comments to an untrusted public translation instance.
