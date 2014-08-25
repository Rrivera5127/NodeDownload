NodeDownload
============

###Install

<code>npm install</code>

<code>node bin/www</code>

<code>app.js <- replace line 6 "config.dev" with "config" and populate config.js and aws.credentials with SQS parameters and hostname</code>

#### Sample Curl
<pre>
curl -H "Content-Type: application/json" -d "{\"recipientEmail\":\"testAddress@gmail.com\",\"orderItems\": [{ \"id\": \"logo11w.png\",\"url\": \"https://www.google.com/images/srpr/logo11w.png\",\"label\": \"logo11w.png\",\"serviceName\": \"GOOGLE_SERVICE\",\"size\": \"16.00 MB\"},{\"id\": \"dog.png\",\"url\": \"https://onetoday.google.com/photo/AMIfv96kYPMYt0ZP-skoQBebDu9mZZ4YU5PzwuKWLFPvkj29J8yO_YSK1ZfhUq-N4zeU89eV80rnXx99rAc5f8VGjbGTLRGja-lBEciSYUrCA_dr_Yb5KnE2cD8n3WdSLfcYvucch0lj-mquG091pShsZ1GDkWD2qX7JwAy_YYf8z5g8kUe-TsU=s460\",\"label\": \"dog.png\",\"serviceName\": \"DOG_SERVICE\", \"size\": \"16.00 MB\"}],\"orderName\":\"TestOrder\",\"user\":{\"fullName\": \"Richard Rivera\",\"email\": \"rrivera@Esri.com\",\"username\": \"rich\",\"orgName\": \"myOrg\"},\"callback\":\"test\"}" http://localhost:3000/download
</pre>


```json
response:

{
    "success": true,
    "url": "http://localhost:3000/downloadService/1408140192931/TestOrder.zip",
    "size": "43.31 kB"
}
```
