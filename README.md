NodeDownload
============


npm install
node bin/www

new command window

curl -H "Content-Type: application/json" -d "{\"orderItems\": [{ \"id\": \"logo11w.png\",\"url\": \"https://www.google.com/images/srpr/logo11w.png\",\"label\": \"logo11w.png\",\"serviceName\": \"GOOGLE_SERVICE\",\"size\": \"16.00 MB\"},{\"id\": \"dog.png\",\"url\": \"https://onetoday.google.com/photo/AMIfv96kYPMYt0ZP-skoQBebDu9mZZ4YU5PzwuKWLFPvkj29J8yO_YSK1ZfhUq-N4zeU89eV80rnXx99rAc5f8VGjbGTLRGja-lBEciSYUrCA_dr_Yb5KnE2cD8n3WdSLfcYvucch0lj-mquG091pShsZ1GDkWD2qX7JwAy_YYf8z5g8kUe-TsU=s460\",\"label\": \"dog.png\",\"serviceName\": \"DOG_SERVICE\", \"size\": \"16.00 MB\"}],\"orderName\":\"TestOrder\",\"user\":{\"fullName\": \"Richard Rivera\",\"email\": \"rrivera@Esri.com\",\"username\": \"rich\",\"orgName\": \"myOrg\"}}" http://localhost:3000/download
