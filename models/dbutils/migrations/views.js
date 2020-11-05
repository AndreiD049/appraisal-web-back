const mongoose = require('mongoose');
const config = require('../../../config');
const { AppraisalItemView } = require('../../AppraisalItemModel');

async function createViews() {
  try
    {
      await mongoose.connect(config.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false,
      });
      const collections = await (await mongoose.connection.db.listCollections().toArray()).map(c => c.name);
      if (collections.indexOf('AppraisalItemsView') === -1) {
        mongoose.connection.db.createCollection('AppraisalItemsView', {
          viewOn: 'appraisalitems'
        });
      }
    } catch (e)
    {
      console.error("Error connecting to mongodb");
    }
}

createViews();