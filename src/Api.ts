import fs from "fs";
import http from "http";
import https from "https";
import toml from "toml";
import express, { Express } from "express";
import session, { MemoryStore } from "express-session";
import cookieParser from "cookie-parser";
import Config from "./Config.js";
import { Chatroom as RESTChatroom, Message as RESTMessage, RestAPI } from "./RestAPI.js";
import Database from "./Database.js";
import WebsocketAPI from "./WebsocketAPI.js";
import ValidationStrategy, { ContentValidationBase, DescriptionValidationBase, PasswordValidationBase, TopicValidationBase, UUIDv4Validation, UsernameValidationAlphaNumeric, UsernameValidationBase } from "./validation.js";
import { ChatappMessageInsertionPayload, ChatroomInfoDeletionPayload, ChatroomInfoInsertionPayload, SubscribableMessage } from "./channels.js";

export interface ValidationStrategies
{
    usernameValidationStrategy: UsernameValidationBase;
    descriptionValidationStrategy: DescriptionValidationBase;
    passwordValidationStrategy: PasswordValidationBase;
    uuidValidationStrategy: ValidationStrategy<string>;
    contentValidationStrategy: ContentValidationBase;
    topicValidationStrategy: TopicValidationBase;
}

export default class Api
{
    private config: Config;
    private validationStrategies: ValidationStrategies;
    private sessionStore: MemoryStore;
    private expressInstance: Express;
    private httpServer: http.Server | https.Server;
    private database: Database;
    private restApi: RestAPI;
    private websocketApi: WebsocketAPI;

    constructor()
    {
        const configFileContent = fs.readFileSync("config.toml", "utf8");
        this.config = toml.parse(configFileContent);

        this.validationStrategies = {
            usernameValidationStrategy: new UsernameValidationAlphaNumeric(),
            descriptionValidationStrategy: new DescriptionValidationBase(),
            passwordValidationStrategy: new PasswordValidationBase(),
            uuidValidationStrategy: new UUIDv4Validation(),
            contentValidationStrategy: new ContentValidationBase(),
            topicValidationStrategy: new TopicValidationBase(),
        };

        this.sessionStore = new MemoryStore();

        this.expressInstance = express();

        this.expressInstance.use(session({
            name: "sid",
            secret: this.config.session.secret,
            saveUninitialized: true,
            cookie: { maxAge: this.config.session.cookie_max_age },
            resave: true,
            store: this.sessionStore,
        }));

        this.expressInstance.use(cookieParser());

        this.database = new Database(this.config);

        this.restApi = new RestAPI(this.config, this.validationStrategies, this.expressInstance, this.database);
        this.restApi.on("post_chatroom", this.onRESTPostChatroom.bind(this));
        this.restApi.on("delete_chatroom", this.onRESTDeleteChatroom.bind(this));
        this.restApi.on("post_message", this.onRESTPostMessage.bind(this));
        this.restApi.on("delete_message", this.onRESTDeleteMessage.bind(this));

        if(this.config.ssl.enabled)
        {
            this.httpServer = https.createServer({
                key: fs.readFileSync(this.config.ssl.key_file, "utf8"),
                cert: fs.readFileSync(this.config.ssl.cert_file, "utf8"),
                ca: fs.readFileSync(this.config.ssl.ca_file, "utf8"),
            }, this.expressInstance);
        }
        else
        {
            this.httpServer = http.createServer(this.expressInstance);
        }

        this.websocketApi = new WebsocketAPI(this.config, this.validationStrategies, this.httpServer, this.database)

        this.httpServer.listen(this.config.port);
    }

    private onRESTPostChatroom(restChatroom: RESTChatroom)
    {
        let message: SubscribableMessage = {
            topic: "",
            type: "insert",
            payload: restChatroom,
        };

        message.topic = "chatrooms";
        this.websocketApi.subscribableChannelChain.subscribeMessage(message);

        message.topic = `chatrooms.${restChatroom.owner_username}`;
        this.websocketApi.subscribableChannelChain.subscribeMessage(message);
    }

    private onRESTDeleteChatroom(restChatroom: RESTChatroom)
    {
        const payload: ChatroomInfoDeletionPayload = {
            id: restChatroom.id,
        };

        let message: SubscribableMessage = {
            topic: "",
            type: "delete",
            payload: payload,
        };

        message.topic = "chatrooms";
        this.websocketApi.subscribableChannelChain.subscribeMessage(message);

        message.topic = `chatrooms.${restChatroom.owner_username}`;
        this.websocketApi.subscribableChannelChain.subscribeMessage(message);
    }

    private onRESTPostMessage(restMessage: RESTMessage)
    {
        let message: SubscribableMessage = {
            topic: "",
            type: "insert",
            payload: restMessage,
        };

        message.topic = `message.${restMessage.chatroom_id}`;
        this.websocketApi.subscribableChannelChain.subscribeMessage(message);

        message.topic = `message.${restMessage.username}`;
        this.websocketApi.subscribableChannelChain.subscribeMessage(message);
    }

    private onRESTDeleteMessage(restMessage: RESTMessage)
    {
        let message: SubscribableMessage = {
            topic: "",
            type: "delete",
            payload: restMessage,
        };

        message.topic = `message.${restMessage.chatroom_id}`;
        this.websocketApi.subscribableChannelChain.subscribeMessage(message);

        message.topic = `message.${restMessage.username}`;
        this.websocketApi.subscribableChannelChain.subscribeMessage(message);
    }
}