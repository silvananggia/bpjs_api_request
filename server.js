const express = require("express");
const axios = require("axios");
const LZString = require("lz-string");
const crypto = require("crypto");

const app = express();
const port = 3001;
const username = "atlas";
const password = "Qwerty1!";
const userKey = "a57a19d821fedfc2387e945b39cbaa29";


async function getToken() {
  const tokenUrl =
    "https://apijkn-dev.bpjs-kesehatan.go.id/wsAtlas_Dev/atlas/token";

  const response = await axios.get(tokenUrl, {
    headers: {
      username: username,
      password: password,
      "user-key": userKey,
    },
  });

  return response.data.response.token;
}

app.get("/api-bpjs/test", async (req, res) => {
  try {

    const token = await getToken();

    if (token) {
      const apiUrl = `https://apijkn-dev.bpjs-kesehatan.go.id/wsAtlas_Dev/atlas/page/30/bulan/11/tahun/2023`;

      
      const response = await axios.get(apiUrl, {
        headers: {
          token: token,
          "user-key": userKey,
        },
      });

      if (response.data.response) {
        const encrypt_method = "aes-256-cbc";
        const key_hash = crypto.createHash("sha256").update(token).digest();
        const iv = key_hash.slice(0, 16);


        try {
          const decipher = crypto.createDecipheriv(
            encrypt_method,
            Buffer.from(key_hash, "hex"),
            iv
          );

          let decrypted = decipher.update(
            Buffer.from(response.data.response, "base64"),
            "base64",
            "utf8"
          );
          decrypted += decipher.final("utf8");

          const decompressedData =
            LZString.decompressFromEncodedURIComponent(decrypted);
        
        const cleanedData = JSON.parse(decompressedData);

        res.json({ data: cleanedData });
        } catch (error) {
          console.error(error); 
          res
            .status(500)
            .json({ error: "Decryption or decoding error: " + error.message });
        }
      } else {
        res.status(500).json({ error: "Unable to fetch or decompress data" });
      }
    } else {
      res.status(500).json({ error: "Unable to obtain the token" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
