import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  try {
    const { model, message, userType } = req.body;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // you can map gomega-v5, etc. here
        messages: [{ role: "user", content: message }],
        temperature: userType === "premium" ? 0.6 : 0.9
      })
    });

    const data = await response.json();
    res.json({ reply: data.choices?.[0]?.message?.content || "⚠️ No reply." });
  } catch (err) {
    res.json({ reply: "⚠️ Error contacting AI." });
  }
});

app.listen(3000, () => console.log("✅ Server running on port 3000"));