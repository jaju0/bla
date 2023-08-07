import http from "http";
import https from "https";
import internal from "stream";
import { URL } from "url";
import crypto from "crypto";
import { RawData, WebSocket, WebSocketServer } from "ws";
import { MemoryStore } from "express-session";
import { signedCookie } from "cookie-parser";
import cookie from "cookie";
import Config from "./Config.js";
import Database, { Message as DatabaseMessage } from "./Database.js";
import { SubscribableChannel, SubscribeChannel, UsersChannel, SubscribableMessage } from "./channels.js";
import { ValidationStrategies } from "./Api.js";

export interface WebSocketClient
{
    uuid: string;
    socket: WebSocket;
    username: string;
}

export default class WebsocketAPI
{
    private config: Config;
    private validationStrategies: ValidationStrategies;
    private sessionStore: MemoryStore;
    private httpServer: http.Server | https.Server;
    private clients: Map<string, WebSocketClient>;
    private server: WebSocketServer;

    private database: Database;

    public readonly channelChain: SubscribeChannel;
    private subscribeChannel: SubscribeChannel;
    private unsubscribeChannel: SubscribeChannel;

    public readonly subscribableChannelChain: SubscribableChannel;
    private chatroomsChannel: SubscribableChannel;
    private usersChannel: SubscribableChannel;
    private messageChannel: SubscribableChannel;

    constructor(config: Config, validationStrategies: ValidationStrategies, sessionStore: MemoryStore, httpServer: http.Server | https.Server, database: Database)
    {
        this.config = config;
        this.validationStrategies = validationStrategies;
        this.sessionStore = sessionStore;
        this.httpServer = httpServer;
        this.clients = new Map();
        this.server = new WebSocketServer({ noServer: true });

        this.database = database;

        this.subscribeChannel = new SubscribeChannel("subscribe");
        this.unsubscribeChannel = new SubscribeChannel("unsubscribe");
        this.chatroomsChannel = new SubscribableChannel("chatrooms");
        this.usersChannel = new UsersChannel("users");
        this.messageChannel = new SubscribableChannel("message");

        this.channelChain = this.subscribeChannel;
        this.subscribableChannelChain = this.chatroomsChannel;

        // build channel chain
        this.subscribeChannel.setNext(this.unsubscribeChannel);
        this.unsubscribeChannel.setNext(this.chatroomsChannel);
        this.chatroomsChannel.setNext(this.usersChannel);
        this.usersChannel.setNext(this.messageChannel);

        // build subscribable channel chain
        this.chatroomsChannel.setNextSubscribable(this.usersChannel);
        this.usersChannel.setNextSubscribable(this.messageChannel);

        this.httpServer.on("upgrade", this.onHttpServerUpgrade.bind(this));
        this.server.on("connection", this.onConnection.bind(this));

        this.subscribeChannel.emitter.on("subscription", this.subscribableChannelChain.addSubscription.bind(this.subscribableChannelChain));
        this.unsubscribeChannel.emitter.on("subscription", this.subscribableChannelChain.removeSubscription.bind(this.subscribableChannelChain));
    }

    private onConnection(socket: WebSocket, username: string)
    {
        let client: WebSocketClient = {
            uuid: crypto.randomUUID(),
            socket: socket,
            username: username,
        };

        this.clients.set(client.uuid, client);

        socket.on("close", this.onClose.bind(this, client));
        socket.on("message", this.onMessage.bind(this, client));
    }

    private onClose(client: WebSocketClient, code: number, reason: Buffer)
    {
        this.subscribableChannelChain.removeClient(client);
        this.clients.delete(client.uuid);
    }

    private onMessage(client: WebSocketClient, data: RawData, isBinary: boolean)
    {
        try
        {
            const dataStr = data.toString();
            const message = JSON.parse(dataStr);
            this.channelChain.publishMessage(client, message);
        }
        catch(error){}
    }

    private onHttpServerUpgrade(request: http.IncomingMessage, socket: internal.Duplex, head: Buffer)
    {
        if(!request.url || !request.headers.host || !request.headers.cookie)
            return socket.destroy();

        const parsedCookies = cookie.parse(request.headers.cookie);
        if(!parsedCookies.sid)
            return socket.destroy();

        const sessionId = signedCookie(parsedCookies.sid, this.config.session.secret);
        if(!sessionId)
            return socket.destroy();

        const protocol = this.httpServer instanceof https.Server ? "https" : "http";
        const url = new URL(request.url, `${protocol}://${request.headers.host}`);

        this.sessionStore.get(sessionId, (err, session) => {
            //  only allow connections with authenticated sessions hence check if username is set
            if(err || !session || !session.username)
                return socket.destroy();
            
            if(url.pathname === this.config.websocket.path)
                this.server.handleUpgrade(request, socket, head, (ws) => this.server.emit("connection", ws, session.username, request));
            else
                socket.destroy();
        });
    }
}