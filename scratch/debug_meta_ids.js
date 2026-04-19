const fetch = require('node-fetch');
require('dotenv').config();

const token = "EAAWZC7Kdv1fMBRCZBmGwuDcJjTwDIBQDATUxN8nt7HjNkuDz6N8LOx7DoUpQmEXiOa27emlct6JOj6E6IPPipGRqZBr9SJ1yDEgy78cG4r1DNQ71SXV1UK56Nu1iVLSERjfGhBWe0wQnAtxiE0fKlpzIWyVzP7ILkFbBZCLZAPTegU1lyWnTqLfMX85QskZBnh6gZDZD";
const pageId = "933102239566867";

async function checkIds() {
    console.log("Checking IDs for token...");
    
    // 1. Check current ID
    try {
        const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}?fields=name,username,instagram_business_account&access_token=${token}`);
        const data = await res.json();
        console.log("Current ID Info:", JSON.stringify(data, null, 2));

        if (data.instagram_business_account) {
            console.log("\n>>> FOUND INSTAGRAM BUSINESS ACCOUNT ID:", data.instagram_business_account.id);
        }
    } catch (e) {
        console.error("Error checking page ID:", e);
    }

    // 2. Check all accounts related to token
    try {
        const res = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=name,id,instagram_business_account&access_token=${token}`);
        const data = await res.json();
        console.log("\nAll accounts related to token:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error checking /me/accounts:", e);
    }
}

checkIds();
