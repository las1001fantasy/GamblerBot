const axios = require('axios');

/**
 * Verifica los rosters de la liga en Fleaflicker.
 * @param {Object} bot - Instancia del bot de Telegraf.
 * @param {boolean} esManual - Indica si se ha ejecutado por comando (true) o por el cron automático (false).
 * @param {Object} ctx - El contexto de Telegraf (solo necesario si esManual es true para responder al mensaje).
 * @param {string} leagueId - ID dinámico de la liga en Fleaflicker (obtenido según el grupo).
 * @param {string} targetChatId - ID dinámico del chat de Telegram destino.
 */
async function verificarRosters(bot, esManual = false, ctx = null, leagueId = process.env.FLEAFLICKER_LEAGUE_ID, targetChatId = null) {
    try {
        // Usa la ID recibida por parámetro o la del .env si no se especifica
        const idLiga = leagueId || process.env.FLEAFLICKER_LEAGUE_ID;
        
        // 1. Llamada a la API pública de Fleaflicker
        const url = `https://www.fleaflicker.com/api/FetchLeagueRosters?league_id=${idLiga}`;
        const response = await axios.get(url);
        
        const rosters = response.data.rosters; // Lista de los equipos de la liga

        let mensajeAlerta = '⚠️ **ROSTERS ILEGALES DETECTADOS** ⚠️\n\n';
        let tieneErrores = false;

        // 2. Analizar cada equipo uno por uno
        for (const roster of rosters) {
            const managerName = roster.team.name; // Nombre del equipo en Fleaflicker
            const jugadores = roster.players || []; 

            const conteoEquiposNFL = {};
            const duplicados = [];

            for (const item of jugadores) {
                const infoJugador = item.proPlayer;
                const equipoNFL = infoJugador ? infoJugador.proTeamAbbreviation : null;

                // Solo contamos si el jugador pertenece a un equipo real (evitamos agentes libres "FA")
                if (equipoNFL && equipoNFL !== 'FA') {
                    conteoEquiposNFL[equipoNFL] = (conteoEquiposNFL[equipoNFL] || 0) + 1;
                    
                    // Si encontramos el segundo jugador del mismo equipo NFL, es ilegal
                    if (conteoEquiposNFL[equipoNFL] === 2) {
                        duplicados.push(equipoNFL);
                    }
                }
            }

            // 3. Si este manager tiene duplicados, lo añadimos al mensaje
            if (duplicados.length > 0) {
                tieneErrores = true;
                mensajeAlerta += `• **${managerName}** tiene más de un jugador de: ${duplicados.join(', ')}\n`;
            }
        }

        // 4. RESPUESTA SEGÚN EL MODO (Manual o Automático)
        if (tieneErrores) {
            // Si hay errores, enviamos la lista de infractores al grupo correspondiente
            const destino = esManual ? ctx.chat.id : (targetChatId || process.env.CHAT_ID);
            await bot.telegram.sendMessage(destino, mensajeAlerta, { parse_mode: 'Markdown' });
            console.log(`¡Infracciones detectadas para la liga ${idLiga}! Mensaje enviado a ${destino}.`);
        } else {
            console.log(`Todos los rosters de la liga ${idLiga} están limpios. No se envía nada automático.`);
            
            // SI ES MANUAL y la liga está limpia, el bot avisa de que todo está OK
            if (esManual && ctx) {
                await ctx.reply('✅ ¡Buenas noticias! Todos los rosters de la liga están limpios y son 100% legales ahora mismo.');
            }
        }

    } catch (error) {
        console.error(`Error al conectar o procesar la API de Fleaflicker (Liga ${leagueId}):`, error.message || error);
        // Si falla la API y alguien ha tirado el comando, le avisamos del error
        if (esManual && ctx) {
            await ctx.reply('❌ Hubo un error al conectar con Fleaflicker. Inténtalo de nuevo más tarde.');
        }
    }
}

module.exports = verificarRosters;