require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const verificarRosters = require('./checker');

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

app.use(express.json());

// 🏈 MAPEO DE GRUPOS DE TELEGRAM -> LIGAS DE FLEAFLICKER
// Asocia cada Chat ID de Telegram con el League ID de Fleaflicker
// ⚠️ Reemplaza 'ID_FLEAFLICKER_1' e 'ID_FLEAFLICKER_2' por los IDs numéricos de tus ligas en la web de Fleaflicker
const LIGAS = {
    '-1001039393022': 'ID_FLEAFLICKER_1', // Grupo Original
    '-100960446115': 'ID_FLEAFLICKER_2'   // Segundo Grupo
};

// 📅 AUTOMATIZACIÓN DIARIA (Se ejecuta a las 16:00 Madrid para cada grupo)
cron.schedule('0 16 * * *', async () => {
    console.log('⏰ ¡Son las 16:00! Ejecutando el check automático para todas las ligas...');
    
    for (const [chatId, leagueId] of Object.entries(LIGAS)) {
        try {
            console.log(`📡 Revisando automatización para el grupo ${chatId} (Liga: ${leagueId})...`);
            await verificarRosters(bot, false, null, leagueId, chatId);
        } catch (error) {
            console.error(`❌ Error en revisión automática para grupo ${chatId}:`, error);
        }
    }
}, {
    scheduled: true,
    timezone: "Europe/Madrid"
});

// 💬 ESCUCHAR PALABRAS CLAVE SIN BARRA ("check", "rosters", etc.)
bot.hears(['check', 'rosters', 'revisar rosters', 'fleaflicker'], async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const leagueId = LIGAS[chatId];

    console.log(`📌 Mensaje recibido en Chat ID: ${chatId}`);

    if (!leagueId) {
        return ctx.reply('⚠️️ Este grupo no está configurado en el bot.');
    }

    await ctx.reply(`🔄 Conectando con Fleaflicker (Liga: ${leagueId}) y revisando los rosters... Un momento.`);
    await verificarRosters(bot, true, ctx, leagueId, chatId);
});

// 💬 COMANDO TRADICIONAL /check CON BARRA
bot.command('check', async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const leagueId = LIGAS[chatId];

    if (!leagueId) {
        return ctx.reply('⚠️ Este grupo no está configurado en el bot.');
    }

    await ctx.reply(`🔄 Conectando con Fleaflicker (Liga: ${leagueId}) y revisando los rosters... Un momento.`);
    await verificarRosters(bot, true, ctx, leagueId, chatId);
});

// 🚀 INICIAR BOT EN TELEGRAM
bot.launch();
console.log('🤖 Bot de Fleaflicker multiliga iniciado correctamente...');

// 🏠 SERVIDOR EXPRESS (HEALTH CHECK)
app.get('/', (req, res) => {
    res.send('El bot de Fleaflicker multiliga está activo.');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Servidor Web escuchando en el puerto ${PORT}`);
});

// 🛑 MANEJO DE CIERRE LIMPIO
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));