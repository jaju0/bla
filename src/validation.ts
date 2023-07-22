
export default interface ValidationStrategy<Type>
{
    validate(param: Type): boolean;
}

// UUID VALIDATION STRATEGIES
export class UUIDv4Validation implements ValidationStrategy<string>
{
    public validate(param: string)
    {
        return param != undefined && /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i.test(param);
    }
}

// USERNAME VALIDATION STRATEGIES
export class UsernameValidationBase implements ValidationStrategy<string>
{
    public validate(param: string)
    {
        return param != undefined && param.length <= 255;
    }
}

export class UsernameValidationAlphaNumeric extends UsernameValidationBase
{
    public validate(param: string)
    {
        return UsernameValidationBase.prototype.validate.call(this, param) && /^[a-zA-Z0-9]*$/.test(param);
    }
}

// DESCRIPTION VALIDATION STRATEGIES
export class DescriptionValidationBase implements ValidationStrategy<string>
{
    public validate(param: string)
    {
        return param != undefined && param.length <= 65535;
    }
}

// PASSWORD VALIDATION STRATEGIES
export class PasswordValidationBase implements ValidationStrategy<string>
{
    /*
     * - At least one letter and one number
     * - At least 8 and max. 60 characters
     */
    public validate(param: string)
    {
        return param != undefined && /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,60}$/.test(param);
    }
}

// MESSAGE CONTENT VALIDATION STRATEGIES
export class ContentValidationBase implements ValidationStrategy<string>
{
    public validate(param: string)
    {
        return param != undefined && param.length < 65535;
    }
}

// CHATROOM TOPIC VALIDATION STRATEGIES
export class TopicValidationBase implements ValidationStrategy<string>
{
    public validate(param: string)
    {
        return param != undefined && param.length  > 0 && param.length <= 255;
    }
}


// STATIC VALIDATIONS
export function validateMD5(param: string)
{
    return param != undefined && /^[a-f0-9]{32}$/i.test(param);
}