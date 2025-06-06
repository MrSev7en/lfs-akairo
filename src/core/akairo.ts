import { Event } from '#core/event';
import type { Module } from '#core/module';
import { Cars } from '#managers/cars';
import { Players } from '#managers/players';
import * as packageJson from '#package';
import type { Locale } from '#types/locale';
import { convertLanguage } from '#utils/i18n';
import { logger } from '#utils/logger';
import i18next from 'i18next';
import { InSim } from 'node-insim';
import {
  IS_TINY,
  Language,
  PacketType,
  TinyType,
  type InSimFlags,
} from 'node-insim/packets';

type ModuleConstructor<T extends Module> = new (akairo: Akairo) => T;

export class Akairo {
  /** InSim instance for server communication */
  public insim!: InSim;

  /** List of connected players */
  public players!: Players;

  /** Utils functions related to players cars */
  public cars!: Cars;

  /** List of loaded modules */
  public modules!: Map<ModuleConstructor<Module>, Module>;

  /** List of loaded localization data */
  public locales!: Locale<any>[];

  private onConnectHandler!: () => void;

  private onDisconnectHandler!: () => void;

  private options!: { host: string; port: number; password: string };

  /**
   * Creates a new Akairo instance.
   * @param settings Configuration settings for the Akairo instance
   * @param settings.id Unique identifier for InSim
   * @param settings.name Display name for InSim
   * @param settings.prefix Command prefix for InSim
   * @param settings.interval Update interval in milliseconds (used in IS_MCI updates)
   * @param settings.interface Interface update interval in milliseconds (used in button interface updates)
   * @param settings.flags InSim flags for connection configuration
   * @param settings.filters.userNameLowerCase Player username will be stored in lower case
   */
  public constructor(
    public readonly settings?: {
      id?: string;
      name?: string;
      prefix?: string;
      interval?: number;
      interface?: number;
      flags?: InSimFlags;
      filters?: { userNameLowerCase?: boolean };
    },
  ) {
    i18next.init({ ns: [], resources: {} });

    this.insim = new InSim(this.settings?.id);
    this.players = new Players(this);
    this.cars = new Cars(this);
    this.modules = new Map();
    this.locales = [];

    this.insim.on('connect', () => this.onInSimConnect());
    this.insim.on('disconnect', () => this.onInSimDisconnect());
  }

  /**
   * Establishes connection to the game server.
   * @param options - Connection configuration options
   * @param options.host - Server hostname or IP address
   * @param options.port - Server InSim port number
   * @param options.password - Server admin password
   */
  public connect(options: {
    host: string;
    port: number;
    password: string;
  }): void {
    this.options = options;

    // We're hidding some packets, because it modifies player list and it can cause exceptions inside modules.
    // This will bind all packets except: ISP_CNL, ISP_PLP and ISP_PLL.
    new Event(this, [
      PacketType.ISP_CNL,
      PacketType.ISP_PLP,
      PacketType.ISP_PLL,
    ]);

    for (const [, module] of this.modules) {
      module.bind();
    }

    // Now we bind hidden packets (excluding others).
    // This will only bind: ISP_CNL, ISP_PLP and ISP_PLL.
    new Event(this, [
      PacketType.ISP_NCN,
      PacketType.ISP_NCI,
      PacketType.ISP_NPL,
      PacketType.ISP_TOC,
      PacketType.ISP_CPR,
      PacketType.ISP_MCI,
    ]);

    this.insim.connect({
      Host: this.options.host,
      Port: this.options.port,
      Admin: this.options.password,
      IName: this.settings?.name,
      Prefix: this.settings?.prefix,
      Interval: this.settings?.interval,
      Flags: this.settings?.flags,
    });
  }

  /**
   * Disconnects from the game server.
   */
  public disconnect(): void {
    this.insim.disconnect();
  }

  /**
   * Sets a handler for connection events.
   * @param callback Function to be called when connection is established
   */
  public onConnect(callback: () => void): void {
    this.onConnectHandler = callback;
  }

  /**
   * Sets a handler for disconnection events.
   * @param callback Function to be called when connection is lost
   */
  public onDisconnect(callback: () => void): void {
    this.onDisconnectHandler = callback;
  }

  /**
   * Get a module instantiated internally.
   * @param module Module class to be get
   */
  public getModule<T extends Module>(module: ModuleConstructor<T>): T {
    return this.modules.get(module) as T;
  }

  /**
   * Loads a module into the system.
   * @param module Module class to be loaded
   */
  public loadModule<T extends Module>(module: ModuleConstructor<T>): void {
    this.modules.set(module, new module(this));
    logger.info(`Module "${module.name}" was load.`);
  }

  /**
   * Unloads a module from the system.
   * @param module Module class to be unloaded
   */
  public unloadModule<T extends Module>(module: ModuleConstructor<T>): void {
    const found = this.modules.get(module);

    if (found) {
      this.modules.delete(module);
      logger.warn(`Module "${module.name}" was unload.`);
    } else {
      logger.error(`Module "${module.name}" was not found.`);
    }
  }

  /**
   * Loads localization data for a specific language.
   * @param language Language identifier
   * @param content Localization content
   * @template T Type of the localization content
   */
  public loadLocale<T>(language: Language, content: T): void {
    const locale = convertLanguage(language);
    const parsed = content as any;
    const values = parsed?.default ?? parsed;

    i18next.addResourceBundle(locale, locale, values);
    this.locales.push({ language, content: values });

    logger.info(`Locale "${Language[language]}" was load.`);
  }

  /**
   * Unloads localization data for a specific language.
   * @param language - Language identifier to unload
   */
  public unloadLocale(language: Language): void {
    const index = this.locales.findIndex((l) => l.language === language);

    if (index !== -1) {
      this.locales.splice(index, 1);
      logger.warn(`Locale "${Language[language]}" was unload.`);
    } else {
      logger.error(`Locale "${Language[language]}" was not found.`);
    }
  }

  private onInSimConnect(): void {
    const { host, port } = this.options;
    const id = this.settings?.id ?? '-';

    logger.info(`InSim "${id}" was connected to: "${host}:${port}"`);

    this.bindInSimReceptors();
    this.onConnectHandler?.();
  }

  private onInSimDisconnect(): void {
    logger.warn('InSim was disconnected.');
    this.onDisconnectHandler?.();
  }

  private bindInSimReceptors(): void {
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_VER, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_NCN, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_NCI, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_NPL, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_NLP, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_MCI, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_SCP, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_SST, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_GTH, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_ISM, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_RES, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_REO, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_RST, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_AXI, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_RIP, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_ALC, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_AXM, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_SLC, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_MAL, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_PLH, ReqI: 2 }));
    this.insim.send(new IS_TINY({ SubT: TinyType.TINY_IPB, ReqI: 2 }));

    logger.info(
      `LFS Akairo v${packageJson.version} was successfully connected and working!`,
    );
  }
}
