import mongoose from "mongoose"

const oderSchema = new mongoose.Schema({
    userId:{type:String,required:true},
    items:{type:Array,required:true},
    amount:{type:Number,required:true},
    address:{type:Object,required:true},
    status:{type:String,default:"Food processing"},
    date: {type:Date,default:Date.now},
    payment:{type:Boolean,default:false}
})

const oderModel = mongoose.models.oder || mongoose.model("oder",oderSchema)

export default oderModel;


