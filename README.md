# Bazzite Bluetooth Autoconnect

Este projeto combina um serviço systemd root-owned, que tenta reconectar os
endereços cadastrados a cada quatro segundos, com um plugin Decky que pesquisa,
pareia e conecta dispositivos Bluetooth através do BlueZ. Qualquer dispositivo
conectado pelo plugin é adicionado à lista, sem filtro por tipo.

O arquivo compartilhado é
`/home/deck/.config/bazzite-bluetooth-fix/devices.txt` (um endereço MAC por
linha). O serviço valida cada endereço antes de passá-lo ao `bluetoothctl`.
Remover um endereço pelo painel tira-o da automação. Se for conectado novamente
pelo plugin, ele volta à lista.
O plugin não instala dependências Python de terceiros: usa o `bluetoothctl`
disponível no Bazzite e a biblioteca padrão.

## 1. Instalar o serviço systemd

Copie `install-service.sh`, `bazzite-bt-autoconnect` e
`bazzite-bt-autoconnect.service` para a mesma pasta no Bazzite e execute:

```bash
chmod +x install-service.sh
./install-service.sh
```

O instalador pede `sudo` quando necessário, cria os arquivos de lista como
propriedade do usuário `deck`, instala o serviço
`bazzite-bt-autoconnect.service`, executa `systemctl daemon-reload` e habilita
e inicia o serviço. Consulte o estado e os registros com:

```bash
systemctl status bazzite-bt-autoconnect.service
journalctl -u bazzite-bt-autoconnect.service -f
```

O serviço depende de BlueZ (`bluetoothctl`) e do serviço `bluetooth.service`.
Para desativar apenas a reconexão:

```bash
sudo systemctl disable --now bazzite-bt-autoconnect.service
```

## 2. Construir o plugin Decky

O código-fonte do plugin está em `plugin/`. Em um ambiente com Node.js e npm
instalados:

```bash
cd plugin
npm ci
npm run build
```

O build gera `plugin/dist/index.js`. O pacote instalável deve conter a pasta do
plugin com `plugin.json`, `main.py` e `dist/index.js`. Crie um ZIP com esses
arquivos na raiz do pacote:

```bash
(cd plugin && zip -r ../bazzite-bt-autoconnect.zip plugin.json main.py dist)
```

Transfira o ZIP para o Bazzite e instale-o em **Decky > Settings > Developer
Mode > Install Plugin from ZIP** (a localização do item pode variar entre
versões do Decky). Alternativamente, extraia esses três itens em:

```text
/home/deck/homebrew/plugins/bazzite-bt-autoconnect/
```

Reinicie o Decky Loader ou o Steam após a instalação. O backend precisa ter
permissão de leitura e escrita no arquivo compartilhado. O instalador deixa
`devices.txt` pertencente a `deck` e gravável pelo proprietário. Instale o
serviço primeiro; caso contrário, o backend do plugin reportará um erro ao
acessar o arquivo.

## Detecção e gestão

No menu do plugin, selecione **Pesquisar dispositivos** e depois **Parear** ou
**Conectar**. O plugin usa `bluetoothctl` para falar com o BlueZ, consulta o
estado final do dispositivo e só então registra seu MAC para reconexão ativa.
Isso vale para qualquer categoria de dispositivo. O painel também mostra a
lista de reconexão. **Remover e desemparelhar** exclui o dispositivo do BlueZ,
desconecta-o e retira seu MAC da lista de reconexão.

O pareamento depende dos mecanismos de agente e autorização do BlueZ disponíveis
na sessão. Se o dispositivo exigir entrada de PIN, confirmação de passkey ou
autorização interativa e o comando falhar, pareie-o pelo fluxo Bluetooth do
sistema e tente **Conectar** no plugin; o MAC só será salvo depois de conexão
confirmada pelo BlueZ.
