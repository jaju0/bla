import http from "http";
import https from "https";
import internal from "stream";
import { URL } from "url";
import crypto from "crypto";
import { RawData, WebSocket, WebSocketServer } from "ws";
import Config from "./Config.js";
import Database, { Message as DatabaseMessage } from "./Database.js";
import { AuthChannel, SubscribableChannel, SubscribeChannel, UsersChannel, SubscribableMessage } from "./channels.js";
import { ValidationStrategies } from "./Api.js";

export interface WebSocketClient
{
    uuid: string;
    socket: WebSocket;
    username?: string;
    api_key?: string;
}

export default class WebsocketAPI
{
    private config: Config;
    private validationStrategies: ValidationStrategies;
    private httpServer: http.Server | https.Server;
    private clients: Map<string, WebSocketClient>;
    private server: WebSocketServer;

    private database: Database;

    public readonly channelChain: AuthChannel;
    private authChannel: AuthChannel;
    private subscribeChannel: SubscribeChannel;
    private unsubscribeChannel: SubscribeChannel;

    public readonly subscribableChannelChain: SubscribableChannel;
    private chatroomsChannel: SubscribableChannel;
    private usersChannel: SubscribableChannel;
    private messageChannel: SubscribableChannel;

    constructor(config: Config, validationStrategies: ValidationStrategies, httpServer: http.Server | https.Server, database: Database)
    {
        this.config = config;
        this.validationStrategies = validationStrategies;
        this.httpServer = httpServer;
        this.clients = new Map();
        this.server = new WebSocketServer({ noServer: true });

        this.database = database;

        this.authChannel = new AuthChannel("auth", this.database, this.validationStrategies.usernameValidationStrategy);
        this.subscribeChannel = new SubscribeChannel("subscribe");
        this.unsubscribeChannel = new SubscribeChannel("unsubscribe");
        this.chatroomsChannel = new SubscribableChannel("chatrooms");
        this.usersChannel = new UsersChannel("users");
        this.messageChannel = new SubscribableChannel("message");

        this.channelChain = this.authChannel;
        this.subscribableChannelChain = this.chatroomsChannel;

        // build channel chain
        this.authChannel.setNext(this.subscribeChannel);
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
        this.chatroomsChannel.emitter.on("add_subscription", this.onChatroomsChannelSubscription.bind(this));
        this.messageChannel.emitter.on("add_subcsription", this.onMessageChannelSubscription.bind(this));
    }

    private async onMessageChannelSubscription(topic: string, params: string[], client: WebSocketClient)
    {
        if(params.length <= 1)
            return;

        let dbMessages: DatabaseMessage[] | undefined = undefined;
        if(this.validationStrategies.uuidValidationStrategy.validate(params[1]))
        {
            const dbMessagesResponse = await this.database.getMessagesByChatroomId(params[1]);
            if(!dbMessagesResponse)
                return;

            dbMessages = dbMessagesResponse;
        }
        else if(this.validationStrategies.usernameValidationStrategy.validate(params[1]))
        {
            const dbMessagesResponse = await this.database.getMessagesByUsername(params[1]);
            if(!dbMessagesResponse)
                return;

            dbMessages = dbMessagesResponse;
        }
        else return;

        const fullTopic = params.join(".");
        let message: SubscribableMessage = {
            topic: fullTopic,
            type: "snapshot",
            payload: dbMessages.map(dbMsg => ({
                id: dbMsg.id,
                chatroom_id: dbMsg.chatroom_id,
                username: dbMsg.username,
                content: dbMsg.content,
                creation_time: dbMsg.creation_time.getTime(),
            })),
        };

        client.socket.send(JSON.stringify(message));
    }

    private async onChatroomsChannelSubscription(topic: string, params: string[], client: WebSocketClient)
    {
        const isAllChatroomsSubscription = params.length == 1;
        const dbChatroomsResponse = isAllChatroomsSubscription ? await this.database.getChatrooms() : await this.database.getChatroomsByOwner(params[1]);

        if(!dbChatroomsResponse)
            return;

        const chatrooms = dbChatroomsResponse;
        const fullTopic = params.join(".");

        let message: SubscribableMessage = {
            topic: fullTopic,
            type: "snapshot",
            payload: chatrooms,
        };

        client.socket.send(JSON.stringify(message));
    }

    private onConnection(socket: WebSocket)
    {
        let client: WebSocketClient = {
            uuid: crypto.randomUUID(),
            socket: socket,
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
        if(!request.url || !request.headers.host)
        {
            socket.destroy();
            return;
        }

        const protocol = this.httpServer instanceof https.Server ? "https" : "http";
        const url = new URL(request.url, `${protocol}://${request.headers.host}`);

        if(url.pathname === this.config.websocket.path)
            this.server.handleUpgrade(request, socket, head, (ws) => this.server.emit("connection", ws, request));
        else
            socket.destroy();
    }
}