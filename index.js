require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const verificarRosters = require('./checker');

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

app.use(express.json());

// 📅 1. PROGRAMACIÓN AUTOMÁTICA (Todos los días a las 16:00)
cron.schedule('0 16 * * *', async () => {
    console.log('⏰ ¡Son las 16:00! Ejecutando el check automático...');
    // Pasamos "false" para que actúe en modo automático (solo habla si hay errores)
    await verificarRosters(bot, false); 
}, {
    scheduled: true,
    timezone: "Europe/Madrid"
});

// 💬 2. COMANDO MANUAL (Cuando alguien escribe /check en el chat)
bot.command('check', async (ctx) => {
    console.log(`🤖 Comando /check recibido de ${ctx.from.username}`);
    await ctx.reply('🔄 Conectando con Fleaflicker y revisando los rosters... Un momento.');
    
    // Pasamos "true" para indicarle que es un comando manual
    // Así, si todo está limpio, responderá "¡Todos los rosters están limpios!" en vez de callarse.
    await verificarRosters(bot, true, ctx);
});

// Lanzar el bot de Telegram
bot.launch();

// Ruta de control simple para Express
app.get('/', (req, res) => {
    res.send('El bot de la liga Fleaflicker está activo y vigilando.');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Servidor del bot escuchando en el puerto ${PORT}`);
});
// Manejo de cierre limpio
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));