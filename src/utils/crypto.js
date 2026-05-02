// WebCrypto Utilities for AES-GCM Encryption with PBKDF2 Key Derivation

// 1. Derive a Key from Password
async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false, // Key extracts are blocked (good for security)
        ["encrypt", "decrypt"]
    );
}

// 2. Encrypt Data
export async function encryptData(dataObject, password) {
    try {
        const enc = new TextEncoder();
        const jsonString = JSON.stringify(dataObject);
        const encodedData = enc.encode(jsonString);

        // Generate random Salt and IV
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        const key = await deriveKey(password, salt);

        const encryptedBuffer = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            encodedData
        );

        const bytes = new Uint8Array(encryptedBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }

        // Pack into JSON structure
        // Convert buffers to Base64 for storage
        return {
            salt: btoa(String.fromCharCode(...salt)),
            iv: btoa(String.fromCharCode(...iv)),
            ciphertext: btoa(binary),
            version: 1, // Schema version
            timestamp: Date.now()
        };
    } catch (err) {
        console.error("Encryption Failed:", err);
        throw err;
    }
}

// 3. Decrypt Data
export async function decryptData(packedData, password) {
    try {
        // Decode Base64 components
        const decodeBase64ToUint8Array = (base64) => {
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes;
        };

        const salt = decodeBase64ToUint8Array(packedData.salt);
        const iv = decodeBase64ToUint8Array(packedData.iv);
        const ciphertext = decodeBase64ToUint8Array(packedData.ciphertext);

        const key = await deriveKey(password, salt);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            ciphertext
        );

        const dec = new TextDecoder();
        const jsonString = dec.decode(decryptedBuffer);
        return JSON.parse(jsonString);
    } catch (err) {
        console.error("Decryption Failed:", err);
        throw new Error("Incorrect Password or Corrupted Data");
    }
}
