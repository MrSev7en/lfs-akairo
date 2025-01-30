# LFS Akairo

LFS Akairo is a JavaScript library (with TypeScript support) designed to simplify the creation of InSim's for Live for Speed. It features a modular system where each part of the InSim is separated, providing greater flexibility and dynamics in development and execution.

## Features

- **Modular Code**: Each module manages a specific part of your InSim.
- **Internationalization with i18n**: Add translation files, and the game will automatically translate based on the available language (fallback to `en-US`).
- **Easy Command Binding**: Command-ready, supports aliases for commands.
- **Binding for Non-Existent Commands**: Handle commands even if they don’t exist.
- **Native Interval System**: Set up a tick (e.g., 1 second), and it will call the function at the specified interval, also providing a list of all players.
- **Effortless Packet Handling**: Receive packet data along with the associated player instance (if available).
- **Dynamic and Fast Player Data Management**: Easily assign and retrieve data from players.

## Installation

```sh
npm install lfs-akairo
```

## Example Usage

```typescript
import { Akairo, Module, Player } from 'lfs-akairo';
import { PacketType } from 'node-insim/packets';

class ExampleModule extends Module {
  public constructor(public readonly akairo: Akairo) {
    super(akairo);

    this.onPacket(PacketType.ISP_NCI, this.onPlayerJoin);
  }

  public async onPlayerJoin(player: Player) {
    player.message(`Hello, ${player.userName}!`);
  }
}

const akairo = new Akairo();

akairo.loadModule(ExampleModule);

akairo.connect({
  host: '127.0.0.1',
  port: 29999,
  password: 'Admin Password',
});
```

For a ready-to-use example, check out our example repository: [LFS Akairo Example](https://github.com/MrSev7en/lfs-akairo-example)

## Managing Player Data

```typescript
player.set('your.data.key', 10); // { your: { data: { key: 10 } } }
player.get<number>('your.data.key'); // 10
```

## Contributing

We welcome suggestions! If you find an issue, please create an [issue](https://github.com/MrSev7en/lfs-akairo/issues). If you'd like to contribute improvements, feel free to fork the repository and submit a pull request.

---

Enjoy coding with LFS Akairo!
