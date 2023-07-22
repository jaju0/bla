import ValidationStrategy, { ContentValidationBase, DescriptionValidationBase, PasswordValidationBase, TopicValidationBase, UUIDv4Validation, UsernameValidationAlphaNumeric, UsernameValidationBase } from "./validation.js";

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
    private validationStrategies: ValidationStrategies;

    constructor()
    {
        this.validationStrategies = {
            usernameValidationStrategy: new UsernameValidationAlphaNumeric(),
            descriptionValidationStrategy: new DescriptionValidationBase(),
            passwordValidationStrategy: new PasswordValidationBase(),
            uuidValidationStrategy: new UUIDv4Validation(),
            contentValidationStrategy: new ContentValidationBase(),
            topicValidationStrategy: new TopicValidationBase(),
        };

    }

}