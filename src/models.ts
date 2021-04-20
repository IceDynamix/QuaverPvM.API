import { Rating } from "go-glicko";
import { getModelForClass, modelOptions, mongoose, plugin, prop, Ref, Severity } from "@typegoose/typegoose";

const defaultRating: Rating = Rating.NewDefaultRating();

type EntityType = "map" | "user";

@modelOptions({
    schemaOptions: { timestamps: true, toObject: { getters: true }, toJSON: { virtuals: true } },
    options: { allowMixed: Severity.ALLOW },
})
class RatedEntityClass {
    @prop()
    public quaverId?: number;

    @prop()
    public entityType!: EntityType;

    @prop()
    public info?: object; // Quaver user.info

    @prop({ default: defaultRating.R() })
    public rating?: number;

    @prop({ default: defaultRating.RD() })
    public rd?: number;

    @prop({ default: defaultRating.Sigma() })
    public volatility?: number;

    // https://www.smogon.com/forums/threads/gxe-glixare-a-much-better-way-of-estimating-a-players-overall-rating-than-shoddys-cre.51169/
    get glixare() {
        if (!this.rating || !this.rd || this.rd > 100) return -1;
        return (
            1 /
            (1 +
                Math.pow(
                    10,
                    ((1500 - this.rating) * Math.PI) /
                        Math.sqrt(
                            3 * Math.LN10 * Math.LN10 * this.rd * this.rd +
                                2500 * (64 * Math.PI * Math.PI + 147 * Math.LN10 * Math.LN10)
                        )
                ))
        );
    }

    get letterRank(): string {
        if (this.glixare === -1) return "z";
        const percentile = 1 - this.glixare;
        if (percentile < 0.01) return "x";
        if (percentile < 0.05) return "u";
        if (percentile < 0.11) return "ss";
        if (percentile < 0.17) return "s+";
        if (percentile < 0.23) return "s";
        if (percentile < 0.3) return "s-";
        if (percentile < 0.38) return "a+";
        if (percentile < 0.46) return "a";
        if (percentile < 0.54) return "a-";
        if (percentile < 0.62) return "b+";
        if (percentile < 0.7) return "b";
        if (percentile < 0.78) return "b-";
        if (percentile < 0.84) return "c+";
        if (percentile < 0.9) return "c";
        if (percentile < 0.95) return "c-";
        if (percentile < 0.95) return "c-";
        if (percentile < 0.975) return "d+";
        return "d";
    }
}

@modelOptions({ schemaOptions: { timestamps: true } })
class ResultClass {
    @prop({ ref: RatedEntityClass })
    public entity1: Ref<RatedEntityClass>;

    @prop({ ref: RatedEntityClass })
    public entity2: Ref<RatedEntityClass>;

    @prop()
    public result!: boolean; // from the perspective of entity1

    @prop({ default: false })
    public processed?: boolean;
}

const RatedEntity = getModelForClass<typeof RatedEntityClass>(RatedEntityClass);
const Result = getModelForClass<typeof ResultClass>(ResultClass);

function createIdFilter(entityType: EntityType, input: string): any | null {
    const quaverId = parseInt(input);
    if (input) return { entityType, quaverId };
    else if (mongoose.Types.ObjectId.isValid(input)) return { entityType, _id: input };
    else return null;
}

export { RatedEntity, Result, EntityType, createIdFilter };
