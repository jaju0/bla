import { WebSocketClient } from "./WebsocketAPI.js";
import Database from "./Database.js";
import { UsernameValidationBase, validateMD5 } from "./validation.js";
import { EventEmitter } from "events";

// PAYLOADS
export interface AuthPayload
{
    username: string;
    api_key: string;
}

export interface SubscribePayload
{
    topics: string[];
}

export interface ChatappMessageInsertionPayload
{
    id: string;
    username: string;
    chatroom_id: string;
    content: string;
    creation_time: number;
}

export interface ChatappMessageDeletionPayload
{
    id: string;
}

export interface ChatroomInfoInsertionPayload
{
    id: string;
    topic: string;
    owner_username: string;
}

export interface ChatroomInfoDeletionPayload
{
    id: string;
}

export interface UserInfoInsertionPayload
{
    username: string;
}

export interface UserInfoDeletionPayload
{
    username: string;
}

// MESSAGE TYPES
export interface Message
{
    topic: string;
    payload: AuthPayload | SubscribePayload | 
        ChatappMessageInsertionPayload[] | ChatappMessageInsertionPayload | ChatappMessageDeletionPayload |
        ChatroomInfoInsertionPayload[] | ChatroomInfoInsertionPayload | ChatroomInfoDeletionPayload |
        UserInfoInsertionPayload[] | UserInfoInsertionPayload | UserInfoDeletionPayload
    ;
}

export interface SubscribableMessage extends Message
{
    type: "snapshot" | "insert" | "delete";
}

// CHANNELS
export default abstract class Channel
{
    public readonly topic: string;
    protected next?: Channel;

    constructor(topic: string)
    {
        this.topic = topic;
    }

    public setNext(channel: Channel)
    {
        this.next = channel;
    }

    public abstract publishMessage(client: WebSocketClient, msg: Message): void;
    public abstract subscribeMessage(msg: Message): void;
}

export class AuthChannel extends Channel
{
    private database: Database;
    private usernameValidationStrategy: UsernameValidationBase;

    constructor(topic: string, database: Database, usernameValidationStrategy: UsernameValidationBase)
    {
        super(topic);
        this.database = database;
        this.usernameValidationStrategy = usernameValidationStrategy;
    }

    public async publishMessage(client: WebSocketClient, msg: Message)
    {
        if(this.topic != msg.topic)
        {
            this.next?.publishMessage(client, msg);
            return;
        }

        const payload = msg.payload as AuthPayload;

        const isMessageDataValid = (
            (payload.username && this.usernameValidationStrategy.validate(payload.username)) &&
            (payload.api_key) && validateMD5(payload.api_key)
        );

        const respond = (success: boolean, responseMsg: string) => {
            const response = {
                topic: "auth",
                payload: {
                    success: success,
                    msg: responseMsg,
                },
            };

            client.socket.send(JSON.stringify(response));
        }

        if(!isMessageDataValid)
            return respond(false, "invalid parameters");

        const dbUserDataResponse = await this.database.getUserData(payload.username);
        if(!dbUserDataResponse)
            return respond(false, "user not found");
        
        const userData = dbUserDataResponse[0];
        if(userData.username != payload.username)
            return respond(false, "user not found");
        

        if(userData.api_key != payload.api_key)
            return respond(false, "api key does not match");

        client.username = userData.username;
        client.api_key = userData.api_key;

        return respond(true, "successful authenticated");
    }

    public subscribeMessage(msg: Message)
    {
        if(this.topic != msg.topic)
            this.next?.subscribeMessage(msg);
    }
}

export class SubscribeChannel extends Channel
{
    public readonly emitter: EventEmitter;

    constructor(topic: string)
    {
        super(topic);
        this.emitter = new EventEmitter();
    }

    public publishMessage(client: WebSocketClient, msg: Message)
    {
        if(this.topic != msg.topic)
        {
            this.next?.publishMessage(client, msg);
            return;
        }

        const payload = msg.payload as SubscribePayload;

        const respond = (success: boolean, responseMsg: string) => {
            const response = {
                topic: "subscribe",
                payload: {
                    topics: payload.topics,
                    success: success,
                    msg: responseMsg,
                },
            };

            client.socket.send(JSON.stringify(response));
        }

        if(!client.api_key)
            return respond(false, "not authenticated");

        for(const topic of payload.topics)
        {
            const params = topic.split(".");
            const topicName = params.length ? params[0] : undefined;

            if(topicName)
                this.emitter.emit("subscription", topicName, params, client);
        }

        return respond(true, "successful");
    }
    
    public subscribeMessage(msg: Message)
    {
        if(this.topic != msg.topic)
            this.next?.subscribeMessage(msg);
    }
}

export class SubscribableChannel extends Channel
{
    public readonly emitter: EventEmitter;
    protected subscriptions: Map<string, Map<string, WebSocketClient>>;
    private nextSubscribable?: SubscribableChannel;

    constructor(topic: string)
    {
        super(topic);
        this.emitter = new EventEmitter();
        this.subscriptions = new Map();
    }

    public setNextSubscribable(channel: SubscribableChannel)
    {
        this.nextSubscribable = channel;
    }
    
    public publishMessage(client: WebSocketClient, msg: Message)
    {
        if(!msg.topic.startsWith(this.topic))
            this.next?.publishMessage(client, msg);
    }

    public subscribeMessage(msg: SubscribableMessage)
    {
        if(!msg.topic.startsWith(this.topic))
        {
            this.next?.subscribeMessage(msg);
            return;
        }
        
        const path = msg.topic;
        const params = msg.topic.split(".");

        const clientsMap = this.subscriptions.get(path);
        if(!clientsMap)
            return;

        for(const client of clientsMap.values())
            client.socket.send(JSON.stringify(msg));
    }

    public addSubscription(topic: string, params: string[], client: WebSocketClient)
    {
        if(!topic.startsWith(this.topic))
        {
            this.nextSubscribable?.addSubscription(topic, params, client);
            return;
        }

        const path = params.join(".");
        let clientsMap = this.subscriptions.get(path);
        if(!clientsMap)
        {
            clientsMap = new Map<string, WebSocketClient>();
            this.subscriptions.set(path, clientsMap);
        }
        
        if(!clientsMap.has(client.uuid))
        {
            clientsMap.set(client.uuid, client);
            this.emitter.emit("add_subscription", topic, params, client);
        }
    }

    public removeSubscription(topic: string, params: string[], client: WebSocketClient)
    {
        if(!topic.startsWith(this.topic))
        {
            this.nextSubscribable?.removeSubscription(topic, params, client);
            return;
        }

        const path = params.join(".");
        let clientsMap = this.subscriptions.get(path);
        if(!clientsMap)
            return;

        if(clientsMap.has(client.uuid))
        {
            clientsMap.delete(client.uuid);
            this.emitter.emit("remove_subscription", topic, params, client);
        }

        if(!clientsMap.size)
            this.subscriptions.delete(path);
    }

    public removeClient(client: WebSocketClient)
    {
        for(const clientMap of this.subscriptions.values())
            clientMap.delete(client.uuid);
    }
}

export class UsersChannel extends SubscribableChannel
{
    constructor(topic: string)
    {
        super(topic);
        this.emitter.on("add_subscription", this.onAddSubscription.bind(this));
        this.emitter.on("remove_subscription", this.onRemoveSubscription.bind(this));
    }

    private async onAddSubscription(topic: string, params: string[], client: WebSocketClient)
    {
        const path = params.join(".");

        if(!client.username || !client.api_key)
            return;

        const snapshotMessage = this.getUserSnapshotMessage(path);
        if(snapshotMessage)
            client.socket.send(JSON.stringify(snapshotMessage));

        const message: SubscribableMessage = {
            topic: path,
            type: "insert",
            payload: {
                username: client.username,
            },
        };

        this.subscribeMessage(message);
    }

    private onRemoveSubscription(topic: string, params: string[], client: WebSocketClient)
    {
        const path = params.join(".");

        if(!client.username || !client.api_key)
            return;

        const message: SubscribableMessage = {
            topic: path,
            type: "delete",
            payload: {
                username: client.username,
            },
        };

        this.subscribeMessage(message);
    }

    private getUserSnapshotMessage(path: string)
    {
        const clientsMap = this.subscriptions.get(path);
        if(!clientsMap)
            return;

        let users = new Array<UserInfoInsertionPayload>();
        for(const client of clientsMap.values())
            if(client.username)
                users.push({ username: client.username });

        let message: SubscribableMessage = {
            topic: path,
            type: "snapshot",
            payload: users,
        };

        return message;
    }
}