import * as mongoose from "mongoose";
import { Rating } from "go-glicko";

const defaultRating: Rating = Rating.NewDefaultRating();

const RatedEntitySchema = new mongoose.Schema(
    {
        _id: { type: Number, required: true, alias: "id" }, // Quaver ID
        info: { type: Object, required: true }, // Quaver user.info
        glicko: {
            rating: { type: Number, default: defaultRating.R(), index: true },
            rd: { type: Number, default: defaultRating.RD() },
            volatility: { type: Number, default: defaultRating.Sigma() },
        },
    },
    { timestamps: true, toObject: { getters: true }, toJSON: { virtuals: true } }
);

// https://www.smogon.com/forums/threads/gxe-glixare-a-much-better-way-of-estimating-a-players-overall-rating-than-shoddys-cre.51169/
RatedEntitySchema.virtual("glixare").get(function (this: any): number {
    if (!this.glicko || this.glicko.rd > 100) return 0;
    const { rating, rd } = this.glicko;

    return (
        Math.round(
            10000 /
                (1 +
                    Math.pow(
                        10,
                        ((1500 - rating) * Math.PI) /
                            Math.sqrt(
                                3 * Math.LN10 * Math.LN10 * rd * rd +
                                    2500 * (64 * Math.PI * Math.PI + 147 * Math.LN10 * Math.LN10)
                            )
                    ))
        ) / 100
    );
});

const User = mongoose.model("User", RatedEntitySchema);
const Map = mongoose.model("Map", RatedEntitySchema);

export { User, Map };
