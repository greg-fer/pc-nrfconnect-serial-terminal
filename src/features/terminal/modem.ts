/*
 * Copyright (c) 2021 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import EventEmitter from 'events';
import { logger } from 'pc-nrfconnect-shared';
import SerialPort, { OpenOptions } from 'serialport';

export type Response = string[];

export type Modem = ReturnType<typeof createModem>;

const cleanUndefined = (obj: OpenOptions) => JSON.parse(JSON.stringify(obj));

export const createModem = (
    serialPortPath: string,
    options: OpenOptions = {}
) => {
    const eventEmitter = new EventEmitter();
    options = cleanUndefined(options);

    logger.info(
        `Opening: '${serialPortPath}' with options: ${JSON.stringify(options)}`
    );

    const serialPort = new SerialPort(serialPortPath, options, e => {
        if (e) {
            logger.error(e);
        }
    });

    serialPort.on('open', () => {
        eventEmitter.emit('open');
    });

    serialPort.on('data', (data: string) => {
        eventEmitter.emit('response', [data]);
    });

    return {
        onResponse: (handler: (lines: Response, error?: string) => void) => {
            eventEmitter.on('response', handler);
            return () => eventEmitter.removeListener('response', handler);
        },

        onOpen: (handler: (error?: string) => void) => {
            eventEmitter.on('open', handler);
            return () => eventEmitter.removeListener('open', handler);
        },

        close: (callback?: (error?: Error | null) => void) => {
            if (serialPort.isOpen) {
                logger.info(`Closing: '${serialPort.path}'`);
                serialPort.close(callback);
            }
        },

        write: (command: string) => {
            serialPort.write(command, e => {
                if (e) console.error(e);
            });

            return true;
        },

        isOpen: () => serialPort.isOpen,

        getpath: () => serialPort.path,
    };
};