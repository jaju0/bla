import { RawData, WebSocket, WebSocketServer } from "ws";

export interface WebSocketClient
{
    uuid: string;
    socket: WebSocket;
    username?: string;
    api_key?: string;
}
