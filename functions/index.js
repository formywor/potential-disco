/**
 * Gomega Watch Backend — Minimal Stripe + Firebase Cloud Functions
 * Handles checkout sessions, webhooks, and payouts.
 */
import express from "express";
import cors from "cors";
import Stripe from "stripe";
import bodyParser from "body-parser";
import functions from "firebase-functions";
import admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

const app = express();
app.use(cors({ origin: true }));

// Parse JSON (for non-webhook routes)
app.use(bodyParser.json());

// Create Checkout Session
app.post("/create-checkout-session", async (req, res) => {
  const { productId, buyerUid } = req.body;
  try {
    const productDoc = await db.collection("products").doc(productId).get();
    if (!productDoc.exists) return res.status(404).json({ error: "Product not found" });

    const product = productDoc.data();
    const sellerUid = product.sellerId;
    const sellerDoc = await db.collection("users").doc(sellerUid).get();
    const seller = sellerDoc.data();

    if (!seller.stripeAccountId) {
      return res.status(400).json({ error: "Seller not connected to Stripe" });
    }

    const fee = Math.round(product.price * 0.005); // 0.5% fee

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "cashapp"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: product.name },
            unit_amount: Math.round(product.price),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        application_fee_amount: fee,
        transfer_data: { destination: seller.stripeAccountId },
      },
      success_url: "https://gomega.watch/success.html",
      cancel_url: "https://gomega.watch/cancel.html",
      metadata: { buyerUid, productId, sellerUid },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Webhook to confirm payment
app.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook error", err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle completed checkout
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const { buyerUid, productId, sellerUid } = session.metadata;

      await db.collection("orders").add({
        buyerUid,
        sellerUid,
        productId,
        paymentIntent: session.payment_intent,
        status: "paid",
        amount: session.amount_total,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    res.json({ received: true });
  }
);

// Create Stripe Connected Account (for seller onboarding)
app.post("/create-connected-account", async (req, res) => {
  const { uid } = req.body;
  try {
    const account = await stripe.accounts.create({
      type: "express",
      capabilities: {
        transfers: { requested: true },
      },
    });

    await db.collection("users").doc(uid).update({
      stripeAccountId: account.id,
    });

    const link = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: "https://gomega.watch/home.html",
      return_url: "https://gomega.watch/home.html",
      type: "account_onboarding",
    });

    res.json({ url: link.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export const api = functions.https.onRequest(app);
