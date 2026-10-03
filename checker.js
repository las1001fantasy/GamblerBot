const axios = require('axios');

/**
 * Verifica los rosters de la liga en Fleaflicker.
 * @param {Object} bot - Instancia del bot de Telegraf.
 * @param {boolean} esManual - Indica si se ha ejecutado por comando (true) o por el cron automático (false).
 * @param {Object} ctx - El contexto de Telegraf (solo necesario si esManual es true para responder al mensaje).
 */
async function verificarRosters(bot, esManual = false, ctx = null) {
    try {
        const leagueId = process.env.FLEAFLICKER_LEAGUE_ID; 
        
        // 1. Llamada a la API pública de Fleaflicker
        const url = `https://www.fleaflicker.com/api/FetchLeagueRosters?league_id=${leagueId}`;
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
            // Si hay errores, enviamos la lista de infractores
            // Si es manual, responde al chat que lo pidió; si es el cron, va al grupo general por defecto
            const destino = esManual ? ctx.chat.id : process.env.CHAT_ID;
            await bot.telegram.sendMessage(destino, mensajeAlerta, { parse_mode: 'Markdown' });
            console.log('¡Infracciones detectadas! Mensaje enviado.');
        } else {
            console.log('Todos los rosters están limpios. No se envía nada.');
            
            // SI ES MANUAL y la liga está limpia, el bot no se calla, avisa de que todo está OK
            if (esManual && ctx) {
                await ctx.reply('✅ ¡Buenas noticias! Todos los rosters de la liga están limpios y son 100% legales ahora mismo.');
            }
        }

    } catch (error) {
        console.error('Error al conectar o procesar la API de Fleaflicker:', error);
        // Si falla la API y alguien ha tirado el comando, le avisamos del error
        if (esManual && ctx) {
            await ctx.reply('❌ Hubo un error al conectar con Fleaflicker. Inténtalo de nuevo más tarde.');
        }
    }
}

module.exports = verificarRosters;
