const Settings = require('../../models/Settings');
const ErrorHandler = require('../../utils/ErrorHandler');

exports.getSettings = async (req, res, next) => {
    /*
        #swagger.tags = ['Settings']
        #swagger.summary = 'Get site settings'
        #swagger.description = 'Retrieve the ecommerce site settings.' 
        #swagger.security = [{ "bearerAuth": [] }]
    */
    try {
        const settings = await Settings.findOne();
        if (!settings) {
            return next(ErrorHandler.notFound('Settings not found'));
        }
        res.status(200).json({
            success: true,
            message: 'Settings fetched successfully',
            data: { settings }
        });
    } 
    catch (error) {
        next(ErrorHandler.serverError('Error fetching settings'));
    }
};

exports.updateSettings = async (req, res, next) => {
    /*
        #swagger.tags = ['Settings']
        #swagger.summary = 'Update site settings'
        #swagger.description = 'Update the ecommerce site settings.'
        #swagger.parameters['body'] = {
            in: 'body',
            description: 'Updated settings data', 
            #swagger.security = [{ "bearerAuth": [] }]
            schema: {
                siteName: 'Fairy Style',
                siteLogo: '',
                siteFavicon: '',
                contactEmail: '',
                contactPhone: '',
                address: '',
                socialLinks: {
                    facebook: '',
                    twitter: '',
                    instagram: '',
                    linkedin: ''
                },
                primaryColor: '#cd0269'
            }
        } 
        
    */
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings(req.body);
        } 
        else {
            Object.assign(settings, req.body);
        }
        await settings.save();
        res.status(200).json({
            success: true,
            message: 'Settings updated successfully',
            data: { settings }
        });
    } 
    catch (error) {
        if (error.name === 'ValidationError') {
            return next(ErrorHandler.badRequest(error.message));
        }
        next(ErrorHandler.serverError('Error updating settings'));
    }
};
