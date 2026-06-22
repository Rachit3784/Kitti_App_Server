import e from "express";
import { AddAddress, DeleteAddress, EditAddress, FetchAddresses } from "../controller/AddressController.js";
import { verifyToken } from "../Middleware/JwtVerify.js";

export const AddressRouter = e.Router();

AddressRouter.post('/add-address', verifyToken, AddAddress);
AddressRouter.post('/delete-address',verifyToken,DeleteAddress);
AddressRouter.get('/fetch-my-address',verifyToken,FetchAddresses);
AddressRouter.post('/edit-address',verifyToken,EditAddress)
