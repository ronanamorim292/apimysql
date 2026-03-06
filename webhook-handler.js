const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();
app.use(express.json());

// Simulação de um Listener na nuvem que o Lovable poderia chamar (MUITO AVANÇADO)
app.post('/lovable/sync', (req, res) => {
  const { newEntityName, fields } = req.body;
  if (!newEntityName) return res.status(400).send('Falta nome');

  // 1. Modificar o schema.prisma via script
  let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
  
  // Monta a string do Prisma
  let newModel = `\nmodel ${newEntityName} {\n  id String @id @default(uuid())\n  tenantId String\n  tenant Tenant @relation(fields: [tenantId], references: [id])\n`;
  
  // Mapeia os campos
  Object.keys(fields).forEach(key => {
     let type = fields[key] === 'number' ? 'Float' : 'String';
     newModel += `  ${key} ${type}\n`;
  });
  newModel += `}\n`;
  
  fs.writeFileSync('prisma/schema.prisma', schema + newModel);

  // 2. Executa os comandos do Prisma e Git
  exec('npx prisma db push && git add . && git commit -m "auto: create ' + newEntityName + '" && git push', (error, stdout, stderr) => {
    if (error) {
      return res.status(500).send(`Erro ao compilar: ${error.message}`);
    }
    // Sucesso, a API está online!
    res.send({ status: 'Sucesso', message: `Tabela ${newEntityName} criada no MySQL e rotas liberadas!` });
  });
});

// app.listen(4000);
