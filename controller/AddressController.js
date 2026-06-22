import { AddressModel } from "../models/AddressSchema.js";


export const AddAddress = async (req, res) => {
  try {


    const {
      ownerId,
      ownerType,
      name,
      addressType,
      landmark,
      addressLine1,
      addressLine2,
      city,
      district,
      state,
      country,
      pincode,
      mobileNo,
      location
    } = req.body;

    /* ================= VALIDATION ================= */

    if (
      !ownerId ||
      !ownerType ||
      !name ||
      !addressType ||
      !addressLine1 ||
      !city ||
      !district ||
      !state ||
      !country ||
      !pincode ||
      !location ||
      !Array.isArray(location.coordinates) ||
      location.coordinates.length !== 2
    ) {
      return res.status(400).json({
        msg: "Required address fields are missing",
        success: false,
      });
    }

    const [longitude, latitude] = location.coordinates;

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        msg: "Invalid latitude or longitude",
        success: false,
      });
    }

    /* ================= CREATE ADDRESS ================= */

    const AddressData = await AddressModel.create({
      ownerId,
      ownerType,
      name,
      addressType,
      landmark: landmark || "",
      addressLine1,
      addressLine2: addressLine2 || "",
      city,
      district,
      state,
      country,
      pincode,
      mobileNo: Array.isArray(mobileNo) ? mobileNo : [],
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
    });

    /* ================= RESPONSE ================= */

    return res.status(201).json({
      msg: "Address saved successfully",
      success: true,
      data: AddressData,
    });

  } catch (error) {
    console.error("❌ AddAddress error:", error);
    return res.status(500).json({
      msg: "Internal Server Error",
      success: false,
    });
  }
};


export const DeleteAddress = async (req, res) => {
  try {
    const { AddressId } = req.body;



    if (!AddressId) {
      return res.status(400).json({
        success: false,
        msg: 'AddressId is missing',
      });
    }

const deletedAddress = await AddressModel.findByIdAndDelete(AddressId);

    if (!deletedAddress) {
      return res.status(404).json({
        success: false,
        msg: 'Address not found',
      });
    }

    return res.status(200).json({
      success: true,
      msg: 'Deleted successfully',
    });
  } catch (error) {
    console.error('DeleteAddress error:', error);
    return res.status(500).json({
      success: false,
      msg: 'Internal Server Error',
    });
  }
};


export const FetchAddresses = async (req, res) => {
  try {
    const { OwnerId, page = 1, limit = 10 } = req.query;

    if (!OwnerId) {
      return res.status(400).json({ msg: "OwnerId required", success: false });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const AddressList = await AddressModel.find({ ownerId: OwnerId }) // Fixed: ownerId not OwnerId
      .skip(skip)
      .limit(parseInt(limit))
      .lean(); // Faster for read-only

    const total = await AddressModel.countDocuments({ ownerId: OwnerId });

    return res.status(200).json({ 
      msg: "Successfully Fetched", 
      success: true, 
      AddressList, 
      total 
    });
  } catch (error) {
    console.error('FetchAddresses error:', error);
    return res.status(500).json({ msg: "Internal Server Error", success: false });
  }
};




export const EditAddress = async (req, res) => {
    try {

        const {
            AddressId,
            
            Name,
            AddressLine1,
            AddressLine2,
            State,
            District,
            City,
            Country,
            Pincode,
            MobileNo,
            landmark,
            addressType
        } = req.body;

        if (
            !AddressId ||
            
            !Name ||
            !AddressLine1 ||
            !State ||
            !District ||
            !City ||
            !Country ||
            !Pincode ||
            !MobileNo) return res.status(400).json({ msg: "Details is missing", success: false });

        const AddressData = await AddressModel.findByIdAndUpdate( AddressId , {
            
            $addToSet : {
            Name,
            AddressLine1,
            AddressLine2: AddressLine2 || "",
            State,
            District,
            City,
            Country,
            Pincode,
            MobileNo,
            landmark,
            addressType
            }
        } , {new : true})


        if (!AddressData) return res.status(400).json({ msg: "Failed to add address", success: false });

        return res.status(200).json({ msg: "Address Saved Successfully", success: true })



    } catch (error) {
        console.error(error)
        return res.status(500).json({ msg: "Internal Server Error", success: false });

    }
}
