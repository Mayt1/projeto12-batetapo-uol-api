import Joi from "joi";

const messageSchema = Joi.object({
    to: Joi
        .string()
        .min(1)
        .required(),

    text: Joi
        .string()
        .min(1)
        .required(),

    type: Joi
        .string()
        .valid("message", "private_message")
        .required(),

    from: Joi
        .string()
        .min(1)
        .required()
});

export default messageSchema;