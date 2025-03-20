const axios = require("axios");

class NovaPoshtaController {
  getBranches = async (req, res) => {
    try {
      const apiKey = process.env.NOVA_POSHTA_API_KEY;
      const { cityRef } = req.query;

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

      const isValidInput = /^[а-яА-ЯіІїЇєЄґҐ'’ -]+$/.test(findByString);
      if (!isValidInput) {
        return res.status(400).json({
          message: "Введіть коректну назву міста українською мовою.",
        });
      }

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
        if (response.data.data.length === 0) {
          return res.status(404).json({
            message: "Місто не знайдено, спробуйте іншу назву.",
          });
        }
        res.status(200).json(response.data.data);
      } else {
        res.status(400).json({
          message: "Nova Poshta API: " + response.data.errors.join(", "),
        });
      }
    } catch (error) {
      res.status(500).json({
        message: "Помилка сервера. Спробуйте ще раз.",
        error: error.message,
      });
    }
  };
}

module.exports = new NovaPoshtaController();
