import Joi from "joi";

const schemaParticipant = Joi.object({
    name: Joi
        .string()
        .min(1)
        .required(),

    lastStatus: Joi
        .number()
        .integer()
        .required()
});

export default schemaParticipant;