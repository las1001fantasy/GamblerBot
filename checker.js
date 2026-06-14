const axios = require('axios');

async function verificarRosters(bot) {
    try {
        const leagueId = process.env.FLEAFLICKER_LEAGUE_ID; 
        
        // 1. Llamada a la API pública de Fleaflicker
        const url = `https://www.fleaflicker.com/api/FetchLeagueRosters?league_id=${leagueId}`;
        const response = await axios.get(url);
        
        const rosters = response.data.rosters; // Los 12 equipos de la liga

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

        // 4. LA CONDICIÓN DE ORO: Solo enviar si hay algún error
        if (tieneErrores) {
            await bot.telegram.sendMessage(process.env.CHAT_ID, mensajeAlerta, { parse_mode: 'Markdown' });
            console.log('¡Infracciones detectadas! Mensaje enviado al grupo de Telegram.');
        } else {
            console.log('Todos los rosters están limpios. No se envía nada.');
        }

    } catch (error) {
        console.error('Error al conectar o procesar la API de Fleaflicker:', error);
    }
}

module.exports = verificarRosters;