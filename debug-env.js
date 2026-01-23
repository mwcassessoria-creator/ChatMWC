require('dotenv').config();

const corsOrigin = process.env.CORS_ORIGIN;
console.log('--- DIAGNOSTICO CORS ---');
console.log('Conteudo bruto de CORS_ORIGIN:', corsOrigin);

if (!corsOrigin) {
    console.error('ERRO: CORS_ORIGIN esta vazio ou indefinido!');
} else {
    const allowedOrigins = corsOrigin.split(',').map(o => o.trim());
    console.log('Origens permitidas processadas:', allowedOrigins);

    const vercelUrl = 'https://chat-mwc.vercel.app';
    const isAllowed = allowedOrigins.includes(vercelUrl);
    console.log(`A URL '${vercelUrl}' esta permitida? ${isAllowed ? 'SIM ✅' : 'NAO ❌'}`);
}
console.log('------------------------');
