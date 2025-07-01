import express from 'express';
import dotenv from 'dotenv';
import { AzureOpenAI } from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public'))); 

const client = new AzureOpenAI({
  endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT!,
  apiVersion: process.env.AZURE_OPENAI_VERSION!
});

app.post('/chat', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // NOUVEAU : Récupère l'historique de la conversation envoyé par le client
    const conversationHistory = req.body.conversationHistory || [];

    // Construit le tableau de messages pour l'API OpenAI
    // Le prompt système doit toujours être le premier message
    const messagesForOpenAI = [
      { role: "system", content: "You are a helpful and concise financial assistant. Provide clear, accurate, and brief answers about investments, budgeting, and financial planning. Keep your responses short and focused unless asked to elaborate." },
      ...conversationHistory // NOUVEAU : Ajoute tous les messages de l'historique
    ];

    const stream = await client.chat.completions.create({
      messages: messagesForOpenAI, // NOUVEAU : Utilise le tableau de messages complet
      max_tokens: 4096,
      temperature: 1,
      top_p: 1,
      model: process.env.AZURE_OPENAI_MODEL!,
      stream: true 
    });

    req.on('close', () => {
      console.log('Client déconnecté, arrêt du flux si actif.');
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        for (const char of content) {
          res.write(`data: ${JSON.stringify({ content: char })}\n\n`);
          await new Promise(resolve => setTimeout(resolve, 20)); 
        }
      }
    }
    res.write('data: [DONE]\n\n'); 
    res.end(); 

  } catch (err) {
    console.error("Erreur:", err);
    res.write(`data: ${JSON.stringify({ error: "Une erreur est survenue lors de la génération." })}\n\n`);
    res.end();
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Écoute sur le port ${process.env.PORT || 3000}`);
});
