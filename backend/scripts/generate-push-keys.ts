// Gera o par de chaves VAPID do Web Push. Rode uma vez e copie as linhas para o infra/.env.
// Perder ou trocar as chaves invalida as inscrições: cada aparelho precisa ativar de novo.
import webpush from 'web-push';

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log('Copie estas linhas para o infra/.env (a chave privada é segredo):');
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log('VAPID_SUBJECT=https://<endereço do app na tailnet>.ts.net');
