const axios = require("axios");

class NovaPoshtaController {
  getBranches = async (req, res) => {
    try {
      const apiKey = process.env.NOVA_POSHTA_API_KEY;
      // Очікуємо, що клієнт передасть cityRef як query параметр
      const { cityRef } = req.query;

      // Налаштовуємо властивості запиту. Якщо передано cityRef, додаємо його в methodProperties
      const methodProperties = { Language: "uk" };
      if (cityRef) {
        methodProperties.CityRef = cityRef;
      }

      const response = await axios.post(
        "https://api.novaposhta.ua/v2.0/json/",
        {
          apiKey: apiKey,
          modelName: "Address",
          calledMethod: "getWarehouses",
          methodProperties: methodProperties,
        }
      );

      if (response.data.success) {
        res.status(200).json(response.data.data);
      } else {
        res.status(500).json({
          message: "Помилка від Nova Poshta API",
          errors: response.data.errors,
        });
      }
    } catch (error) {
      res.status(500).json({
        message: "Internal server error",
        error: error.message,
      });
    }
  };

  getCities = async (req, res) => {
    try {
      const apiKey = process.env.NOVA_POSHTA_API_KEY;

      const findByString = req.query.q || "";

      const response = await axios.post(
        "https://api.novaposhta.ua/v2.0/json/",
        {
          apiKey: apiKey,
          modelName: "Address",
          calledMethod: "getCities",
          methodProperties: {
            FindByString: findByString,
            Language: "uk",
          },
        }
      );

      if (response.data.success) {
        res.status(200).json(response.data.data);
      } else {
        res.status(500).json({
          message: "Помилка від Nova Poshta API",
          errors: response.data.errors,
        });
      }
    } catch (error) {
      res.status(500).json({
        message: "Internal server error",
        error: error.message,
      });
    }
  };
}

module.exports = new NovaPoshtaController();
