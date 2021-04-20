import * as mongoose from "mongoose";
import { Rating } from "go-glicko";

const defaultRating: Rating = Rating.NewDefaultRating();

export const UserSchema = new mongoose.Schema(
    {
        _id: { type: Number, required: true, alias: "id" }, // Quaver ID
        info: { type: Object, required: true }, // Quaver user.info
        glicko: {
            rating: { type: Number, default: defaultRating.R() },
            rd: { type: Number, default: defaultRating.RD() },
            volatility: { type: Number, default: defaultRating.Sigma() },
        },
    },
    { timestamps: true }
);

// https://www.smogon.com/forums/threads/gxe-glixare-a-much-better-way-of-estimating-a-players-overall-rating-than-shoddys-cre.51169/
UserSchema.methods.glixare = function (this: any): number {
    if (!this.glicko || this.glicko.rd > 100) return 0;
    return (
        Math.round(
            10000 /
                ((1 + 10) ^
                    (((1500 - this.glicko.rating) * Math.PI) /
                        Math.sqrt(
                            (3 * Math.LN10) ^ (2 * this.glicko.rd) ^ (2 + 2500 * ((64 * Math.PI) ^ (2 + 147 * Math.LN10) ^ 2))
                        )))
        ) / 100
    );
};

export default mongoose.model("User", UserSchema);
