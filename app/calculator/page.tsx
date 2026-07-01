"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AllianceGate from "../../components/AllianceGate";

const supabase = createClient();

export default function CalculatorPage() {
  const stateNames: Record<string, string> = {
    AL: "Alabama",
    AK: "Alaska",
    AZ: "Arizona",
    AR: "Arkansas",
    CA: "California",
    CO: "Colorado",
    CT: "Connecticut",
    DE: "Delaware",
    FL: "Florida",
    GA: "Georgia",
    HI: "Hawaii",
    ID: "Idaho",
    IL: "Illinois",
    IN: "Indiana",
    IA: "Iowa",
    KS: "Kansas",
    KY: "Kentucky",
    LA: "Louisiana",
    ME: "Maine",
    MD: "Maryland",
    MA: "Massachusetts",
    MI: "Michigan",
    MN: "Minnesota",
    MS: "Mississippi",
    MO: "Missouri",
    MT: "Montana",
    NE: "Nebraska",
    NV: "Nevada",
    NH: "New Hampshire",
    NJ: "New Jersey",
    NM: "New Mexico",
    NY: "New York",
    NC: "North Carolina",
    ND: "North Dakota",
    OH: "Ohio",
    OK: "Oklahoma",
    OR: "Oregon",
    PA: "Pennsylvania",
    RI: "Rhode Island",
    SC: "South Carolina",
    SD: "South Dakota",
    TN: "Tennessee",
    TX: "Texas",
    UT: "Utah",
    VT: "Vermont",
    VA: "Virginia",
    WA: "Washington",
    WV: "West Virginia",
    WI: "Wisconsin",
    WY: "Wyoming",
    DC: "Washington DC",
  };

  const stateHourlyRates: Record<string, number> = {
    AL: 140,
    AK: 180,
    AZ: 150,
    AR: 140,
    CA: 200,
    CO: 175,
    CT: 180,
    DE: 160,
    FL: 155,
    GA: 160,
    HI: 220,
    ID: 150,
    IL: 180,
    IN: 150,
    IA: 145,
    KS: 145,
    KY: 145,
    LA: 150,
    ME: 160,
    MD: 170,
    MA: 190,
    MI: 165,
    MN: 170,
    MS: 140,
    MO: 150,
    MT: 150,
    NE: 145,
    NV: 175,
    NH: 160,
    NJ: 200,
    NM: 150,
    NY: 220,
    NC: 150,
    ND: 145,
    OH: 155,
    OK: 145,
    OR: 190,
    PA: 170,
    RI: 170,
    SC: 145,
    SD: 140,
    TN: 150,
    TX: 160,
    UT: 155,
    VT: 160,
    VA: 165,
    WA: 200,
    WV: 140,
    WI: 155,
    WY: 150,
    DC: 210,
  };

  const stateTaxRates: Record<string, number> = {
    AL: 4,
    AK: 0,
    AZ: 8.6,
    AR: 6.5,
    CA: 7.25,
    CO: 2.9,
    CT: 6.35,
    DE: 0,
    FL: 6.0,
    GA: 4.0,
    HI: 4.0,
    ID: 6.0,
    IL: 6.25,
    IN: 7.0,
    IA: 6.0,
    KS: 6.5,
    KY: 6.0,
    LA: 4.45,
    ME: 5.5,
    MD: 6.0,
    MA: 6.25,
    MI: 6.0,
    MN: 6.875,
    MS: 7.0,
    MO: 4.225,
    MT: 0,
    NE: 5.5,
    NV: 8.38,
    NH: 0,
    NJ: 6.625,
    NM: 5.125,
    NY: 8.875,
    NC: 4.75,
    ND: 5.0,
    OH: 5.75,
    OK: 4.5,
    OR: 0,
    PA: 6.0,
    RI: 7.0,
    SC: 6.0,
    SD: 4.5,
    TN: 7.0,
    TX: 8.25,
    UT: 4.85,
    VT: 6.0,
    VA: 5.3,
    WA: 6.5,
    WV: 6.0,
    WI: 5.0,
    WY: 4.0,
    DC: 6.0,
  };

  const cityRateMultipliers: Record<string, Record<string, number>> = {
    AL: {
      "Statewide Average": 1,
      Birmingham: 1.08,
      Montgomery: 1,
      Mobile: 1.03,
      Huntsville: 1.08,
      Tuscaloosa: 1.02,
    },
    AK: {
      "Statewide Average": 1,
      Anchorage: 1.08,
      Fairbanks: 1.02,
      Juneau: 1.06,
    },
    AZ: {
      "Statewide Average": 1,
      Phoenix: 1.08,
      Scottsdale: 1.18,
      Tempe: 1.08,
      Tucson: 1,
      Mesa: 1.02,
      Flagstaff: 1.08,
    },
    AR: {
      "Statewide Average": 1,
      "Little Rock": 1.08,
      Fayetteville: 1.08,
      "Fort Smith": 1,
      "Hot Springs": 1.04,
    },
    CA: {
      "Statewide Average": 1,
      "Los Angeles": 1.3,
      "San Francisco": 1.4,
      "San Diego": 1.22,
      Sacramento: 1.08,
      Oakland: 1.28,
      "San Jose": 1.3,
      "Inland Empire": 1.02,
      Fresno: 0.95,
    },
    CO: {
      "Statewide Average": 1,
      Denver: 1.15,
      Boulder: 1.2,
      "Colorado Springs": 1.02,
      "Fort Collins": 1.08,
      Aspen: 1.3,
    },
    CT: {
      "Statewide Average": 1,
      Hartford: 1,
      "New Haven": 1.08,
      Stamford: 1.2,
      Bridgeport: 1.05,
    },
    DE: {
      "Statewide Average": 1,
      Wilmington: 1.08,
      Dover: 1,
      Newark: 1.04,
    },
    FL: {
      "Statewide Average": 1,
      Miami: 1.25,
      Orlando: 1.12,
      Tampa: 1.08,
      Jacksonville: 1,
      "Fort Lauderdale": 1.18,
      "West Palm Beach": 1.18,
    },
    GA: {
      "Statewide Average": 1,
      Atlanta: 1.18,
      Savannah: 1.08,
      Augusta: 1,
      Athens: 1.05,
      Macon: 0.95,
    },
    HI: {
      "Statewide Average": 1,
      Honolulu: 1.18,
      Maui: 1.15,
      Hilo: 1,
      Kona: 1.08,
    },
    ID: {
      "Statewide Average": 1,
      Boise: 1.08,
      Meridian: 1.05,
      "Idaho Falls": 1,
      Coeurdalene: 1.08,
    },
    IL: {
      "Statewide Average": 1,
      Chicago: 1.22,
      Naperville: 1.12,
      Springfield: 0.98,
      Rockford: 0.95,
      Peoria: 0.98,
    },
    IN: {
      "Statewide Average": 1,
      Indianapolis: 1.08,
      "Fort Wayne": 1,
      Bloomington: 1.05,
      "South Bend": 1,
    },
    IA: {
      "Statewide Average": 1,
      "Des Moines": 1.06,
      "Iowa City": 1.05,
      "Cedar Rapids": 1,
      Davenport: 1,
    },
    KS: {
      "Statewide Average": 1,
      Wichita: 1,
      "Kansas City": 1.06,
      Lawrence: 1.06,
      Topeka: 0.98,
    },
    KY: {
      "Statewide Average": 1,
      Louisville: 1.08,
      Lexington: 1.05,
      "Bowling Green": 1,
    },
    LA: {
      "Statewide Average": 1,
      "New Orleans": 1.15,
      "Baton Rouge": 1.05,
      Lafayette: 1,
      Shreveport: 0.95,
    },
    ME: {
      "Statewide Average": 1,
      Portland: 1.12,
      Bangor: 1,
      Augusta: 0.98,
    },
    MD: {
      "Statewide Average": 1,
      Baltimore: 1.08,
      Annapolis: 1.12,
      Bethesda: 1.2,
      "Silver Spring": 1.12,
    },
    MA: {
      "Statewide Average": 1,
      Boston: 1.25,
      Cambridge: 1.25,
      Worcester: 1.05,
      Salem: 1.12,
      Springfield: 0.98,
    },
    MI: {
      "Statewide Average": 1,
      Detroit: 1.08,
      "Grand Rapids": 1.05,
      "Ann Arbor": 1.12,
      Lansing: 1,
      TraverseCity: 1.08,
    },
    MN: {
      "Statewide Average": 1,
      Minneapolis: 1.12,
      "St. Paul": 1.08,
      Duluth: 1,
      Rochester: 1.02,
    },
    MS: {
      "Statewide Average": 1,
      Jackson: 1,
      Gulfport: 1,
      Oxford: 1.05,
      Biloxi: 1.02,
    },
    MO: {
      "Statewide Average": 1,
      "Kansas City": 1.08,
      "St. Louis": 1.08,
      Springfield: 1,
      Columbia: 1.04,
    },
    MT: {
      "Statewide Average": 1,
      Bozeman: 1.15,
      Missoula: 1.08,
      Billings: 1,
      Helena: 1.02,
    },
    NE: {
      "Statewide Average": 1,
      Omaha: 1.06,
      Lincoln: 1.04,
      "Grand Island": 0.98,
    },
    NV: {
      "Statewide Average": 1,
      "Las Vegas": 1.18,
      Reno: 1.08,
      Henderson: 1.08,
      "Carson City": 1,
    },
    NH: {
      "Statewide Average": 1,
      Manchester: 1.06,
      Portsmouth: 1.12,
      Nashua: 1.08,
    },
    NJ: {
      "Statewide Average": 1,
      Newark: 1.08,
      "Jersey City": 1.18,
      Hoboken: 1.22,
      "Asbury Park": 1.12,
      Princeton: 1.15,
    },
    NM: {
      "Statewide Average": 1,
      Albuquerque: 1.04,
      "Santa Fe": 1.12,
      "Las Cruces": 0.98,
      Taos: 1.08,
    },
    NY: {
      "Statewide Average": 1,
      "New York City": 1.35,
      Brooklyn: 1.32,
      Queens: 1.25,
      "Long Island": 1.18,
      Buffalo: 0.95,
      Rochester: 0.95,
      Albany: 1,
      Syracuse: 0.95,
    },
    NC: {
      "Statewide Average": 1,
      Charlotte: 1.1,
      Raleigh: 1.1,
      Durham: 1.08,
      Asheville: 1.12,
      Wilmington: 1.05,
      Greensboro: 1,
    },
    ND: {
      "Statewide Average": 1,
      Fargo: 1.05,
      Bismarck: 1,
      "Grand Forks": 0.98,
    },
    OH: {
      "Statewide Average": 1,
      Columbus: 1.08,
      Cleveland: 1.05,
      Cincinnati: 1.06,
      Dayton: 0.98,
      Toledo: 0.98,
    },
    OK: {
      "Statewide Average": 1,
      "Oklahoma City": 1.05,
      Tulsa: 1.05,
      Norman: 1.02,
    },
    OR: {
      "Statewide Average": 1,
      Portland: 1.15,
      Eugene: 1.05,
      Bend: 1.15,
      Salem: 1,
      Medford: 0.98,
    },
    PA: {
      "Statewide Average": 1,
      Philadelphia: 1.15,
      Pittsburgh: 1.08,
      Lancaster: 1.02,
      Harrisburg: 1,
      Allentown: 1.02,
    },
    RI: {
      "Statewide Average": 1,
      Providence: 1.08,
      Newport: 1.15,
      Warwick: 1,
    },
    SC: {
      "Statewide Average": 1,
      Charleston: 1.15,
      Columbia: 1.04,
      Greenville: 1.05,
      MyrtleBeach: 1.08,
    },
    SD: {
      "Statewide Average": 1,
      "Sioux Falls": 1.05,
      "Rapid City": 1.02,
      Aberdeen: 0.98,
    },
    TN: {
      "Statewide Average": 1,
      Nashville: 1.15,
      Memphis: 1.05,
      Knoxville: 1.05,
      Chattanooga: 1.04,
    },
    TX: {
      "Statewide Average": 1,
      Austin: 1.18,
      Dallas: 1.12,
      Houston: 1.08,
      "San Antonio": 1.04,
      "Fort Worth": 1.05,
      ElPaso: 0.95,
    },
    UT: {
      "Statewide Average": 1,
      "Salt Lake City": 1.1,
      ParkCity: 1.2,
      Provo: 1.05,
      Ogden: 1,
    },
    VT: {
      "Statewide Average": 1,
      Burlington: 1.1,
      Montpelier: 1.02,
      Rutland: 0.98,
    },
    VA: {
      "Statewide Average": 1,
      Richmond: 1.08,
      Arlington: 1.2,
      Alexandria: 1.18,
      "Virginia Beach": 1.05,
      Norfolk: 1.02,
    },
    WA: {
      "Statewide Average": 1,
      Seattle: 1.25,
      Bellevue: 1.28,
      Tacoma: 1.08,
      Spokane: 0.98,
      Olympia: 1.04,
      Vancouver: 1.05,
    },
    WV: {
      "Statewide Average": 1,
      Charleston: 1,
      Morgantown: 1.05,
      Huntington: 0.98,
    },
    WI: {
      "Statewide Average": 1,
      Milwaukee: 1.06,
      Madison: 1.1,
      "Green Bay": 1,
      Kenosha: 1,
    },
    WY: {
      "Statewide Average": 1,
      Jackson: 1.25,
      Cheyenne: 1.02,
      Casper: 1,
      Laramie: 1.02,
    },
    DC: {
      "Statewide Average": 1,
      "Washington DC": 1.15,
    },
  };

  const [shopName, setShopName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [artistContact, setArtistContact] = useState("");
  const [shopEmail, setShopEmail] = useState("");
  const [sendShopCopy, setSendShopCopy] = useState(true);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [tattooDescription, setTattooDescription] = useState("");

  const [state, setState] = useState("AZ");
  const [city, setCity] = useState("Statewide Average");
  const [hasLoadedSavedLocation, setHasLoadedSavedLocation] = useState(false);
  const [hourlyRate, setHourlyRate] = useState(stateHourlyRates.AZ);
  const [hours, setHours] = useState(2);
  const [pricingMode, setPricingMode] = useState<"hourly" | "piece">("hourly");
  const [piecePrice, setPiecePrice] = useState(300);

  const [materials, setMaterials] = useState(25);
const [operatingModel, setOperatingModel] = useState<
  "independent" | "booth_rent" | "percentage_split"
>("independent");
const [boothRent, setBoothRent] = useState(40);
const [artistPercentage, setArtistPercentage] = useState(70);
const [shopPercentage, setShopPercentage] = useState(30);
const [boothRentFrequency, setBoothRentFrequency] =
  useState<"per_appointment" | "weekly" | "monthly">("per_appointment");

const [weeklyBoothRent, setWeeklyBoothRent] = useState(0);
const [monthlyBoothRent, setMonthlyBoothRent] = useState(0);
const [appointmentsPerWeek, setAppointmentsPerWeek] = useState(0);
const [appointmentsPerMonth, setAppointmentsPerMonth] = useState(0);
const [buildExpensesIntoQuote, setBuildExpensesIntoQuote] =
  useState(false);
  const [applyTax, setApplyTax] = useState(true);
  const [taxRate, setTaxRate] = useState(stateTaxRates.AZ);
  const [bookingInstructions, setBookingInstructions] = useState("");
  const [bookingLink, setBookingLink] = useState("");

  const [depositRequired, setDepositRequired] = useState(false);
  const [depositPercent, setDepositPercent] = useState(20);
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [depositDueHours, setDepositDueHours] = useState(24);

  const [applyDiscount, setApplyDiscount] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [quoteLink, setQuoteLink] = useState("");
  const [isCreatingQuoteLink, setIsCreatingQuoteLink] = useState(false);
  const [isAllianceMember, setIsAllianceMember] = useState(false);
  const [professionType, setProfessionType] =
  useState("tattoo_artist");
  const minimumCharge = professionType === "piercer" ? 40 : 150;

  const cityOptions = Object.keys(cityRateMultipliers[state] || { "Statewide Average": 1 });
  const cityMultiplier = cityRateMultipliers[state]?.[city] || 1;
  const suggestedHourlyRate = Math.round(stateHourlyRates[state] * cityMultiplier);

const basePrice = pricingMode === "hourly" ? hourlyRate * hours : piecePrice;

const allocatedBoothRent =
  operatingModel !== "booth_rent"
    ? 0
    : boothRentFrequency === "weekly" && appointmentsPerWeek > 0
    ? weeklyBoothRent / appointmentsPerWeek
    : boothRentFrequency === "monthly" && appointmentsPerMonth > 0
    ? monthlyBoothRent / appointmentsPerMonth
    : boothRent;

const overheadAllocation =
  operatingModel === "booth_rent" ? allocatedBoothRent : 0;

const subtotalBeforeDiscount =
  buildExpensesIntoQuote
    ? basePrice + materials + overheadAllocation
    : basePrice;
  const discountAmount = applyDiscount ? discount : 0;
  const taxableSubtotal = Math.max(subtotalBeforeDiscount - discountAmount, 0);
  const taxAmount = applyTax ? taxableSubtotal * (taxRate / 100) : 0;
  const total = taxableSubtotal + taxAmount;

  const roundedTotal = Math.ceil(total / 5) * 5;
  const finalTotal = Math.max(roundedTotal, minimumCharge);

  const depositAmount = depositRequired
  ? Math.round(finalTotal * (depositPercent / 100))
  : 0;

  let artistEarnings = 0;
let shopEarnings = 0;

if (operatingModel === "independent") {
  artistEarnings =
    taxableSubtotal -
    materials;

  shopEarnings = 0;
}

if (operatingModel === "booth_rent") {
  artistEarnings =
    taxableSubtotal -
    materials -
    allocatedBoothRent;

  shopEarnings = allocatedBoothRent;
}

if (operatingModel === "percentage_split") {
  const splitRevenue =
    Math.max(basePrice - discountAmount, 0);

  const artistGrossShare =
    splitRevenue * (artistPercentage / 100);

  artistEarnings =
    artistGrossShare -
    materials;

  shopEarnings =
    splitRevenue * (shopPercentage / 100);
}

const profit = artistEarnings;

const profitMargin =
  taxableSubtotal > 0
    ? (artistEarnings / taxableSubtotal) * 100
    : 0;

  const confidenceMessage =
    profitMargin < 30
      ? "⚠️ Low margin — this quote may be underpriced."
      : profitMargin < 50
      ? "👍 Solid pricing — healthy professional quote."
      : "🔥 Premium positioning — strong pricing structure.";

  const confidenceColor =
    profitMargin < 30 ? "#ff3b30" : profitMargin < 50 ? "#ff9500" : "#34c759";

  const marketPositionMessage =
  professionType === "piercer"
    ? "💎 Piercing pricing varies heavily by jewelry, placement, and service structure."
    :
    hourlyRate < suggestedHourlyRate
      ? "⬆️ You are pricing below your selected market."
      : hourlyRate > suggestedHourlyRate
      ? "💎 You are positioned above market as a premium artist."
      : "✅ You are aligned with the selected market rate.";

      const professionLabel =
  professionType === "piercer"
    ? "Piercer"
    : professionType === "shop"
    ? "Shop"
    : "Tattoo Artist";

const serviceLabel =
  professionType === "piercer"
    ? "Piercing"
    : "Tattoo";

const descriptionLabel =
  professionType === "piercer"
    ? "Service Description"
    : "Tattoo Description";

const appointmentLabel =
  professionType === "piercer"
    ? "Appointment"
    : "Tattoo Session";
const presetLabels =
  professionType === "piercer"
    ? {
        small: "Single Piercing",
        medium: "Double Piercing",
        large: "Advanced Session",
        fullDay: "Full Appointment Block",
      }
    : {
        small: "Small",
        medium: "Medium",
        large: "Large",
        fullDay: "Full Day",
      };
useEffect(() => {
  localStorage.removeItem("apaCalculatorState");
  localStorage.removeItem("apaCalculatorCity");

  setHasLoadedSavedLocation(true);
}, []);

useEffect(() => {
  if (!hasLoadedSavedLocation) return;

  const validCity = cityRateMultipliers[state]?.[city]
    ? city
    : "Statewide Average";

  if (validCity !== city) {
    setCity(validCity);
    return;
  }

  setHourlyRate(stateHourlyRates[state]);
  setTaxRate(stateTaxRates[state]);
}, [state, city, hasLoadedSavedLocation]);

  useEffect(() => {
  async function loadMembership() {
    try {
      const { data: authData } = await supabase.auth.getUser();

      const user = authData?.user;

      if (!user) {
        setIsAllianceMember(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("membership_tier, profession_type")
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        setIsAllianceMember(false);
        return;
      }

      setIsAllianceMember(
        profile.membership_tier === "alliance" ||
        profile.membership_tier === "admin"
      );

      setProfessionType(
         profile.profession_type || "tattoo_artist"
      );
    } catch (error) {
      console.error("MEMBERSHIP LOAD ERROR:", error);
      setIsAllianceMember(false);
    }
  }

  loadMembership();
}, []);

  useEffect(() => {
    setHourlyRate(suggestedHourlyRate);
  }, [city]);

  useEffect(() => {
  async function loadShopSettings() {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) return;

      const { data, error } = await supabase
        .from("shop_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("SHOP SETTINGS LOAD ERROR:", error);
        return;
      }

      if (!data) {
  setShopName("");
  setArtistName("");
  setArtistContact("");
  setShopEmail("");
  setSendShopCopy(true);

  setState("AZ");
  setCity("Statewide Average");
  setPricingMode("hourly");
  setHourlyRate(stateHourlyRates.AZ);
  setPiecePrice(300);
  setMaterials(25);

  setOperatingModel("independent");
  setBoothRent(40);
  setArtistPercentage(70);
  setShopPercentage(30);
  setBoothRentFrequency("per_appointment");
  setWeeklyBoothRent(0);
  setMonthlyBoothRent(0);
  setAppointmentsPerWeek(0);
  setAppointmentsPerMonth(0);
  setBuildExpensesIntoQuote(false);

  setTaxRate(stateTaxRates.AZ);
  setApplyTax(true);

  setBookingInstructions("");
  setBookingLink("");

  setDepositRequired(false);
  setDepositPercent(20);
  setPaymentInstructions("");
  setDepositDueHours(24);

  setApplyDiscount(false);
  setDiscount(0);

  return;
}

setShopName(data.shop_name || "");
setArtistName(data.artist_name || "");
setArtistContact(data.artist_contact || "");
setShopEmail(data.shop_email || "");
setSendShopCopy(Boolean(data.send_shop_copy));

setState(data.state || "AZ");
setCity(data.city || "Statewide Average");
setPricingMode(data.pricing_mode || "hourly");
setHourlyRate(Number(data.hourly_rate) || stateHourlyRates.AZ);
setPiecePrice(Number(data.piece_price) || 300);
setMaterials(Number(data.materials) || 25);

setOperatingModel(data.operating_model || "independent");
setBoothRent(Number(data.booth_rent) || 40);
setArtistPercentage(Number(data.artist_percentage) || 70);
setShopPercentage(Number(data.shop_percentage) || 30);
setBoothRentFrequency(data.booth_rent_frequency || "per_appointment");
setWeeklyBoothRent(Number(data.weekly_booth_rent) || 0);
setMonthlyBoothRent(Number(data.monthly_booth_rent) || 0);
setAppointmentsPerWeek(Number(data.appointments_per_week) || 0);
setAppointmentsPerMonth(Number(data.appointments_per_month) || 0);
setBuildExpensesIntoQuote(Boolean(data.build_expenses_into_quote));

setTaxRate(Number(data.tax_rate) || stateTaxRates.AZ);
setApplyTax(Boolean(data.apply_tax));

setBookingInstructions(data.booking_instructions || "");
setBookingLink(data.booking_link || "");

setDepositRequired(Boolean(data.deposit_required));
setDepositPercent(Number(data.deposit_percent) || 20);
setPaymentInstructions(data.payment_instructions || "");
setDepositDueHours(Number(data.deposit_due_hours) || 24);

setApplyDiscount(Boolean(data.apply_discount));
setDiscount(Number(data.discount) || 0);
    } catch (error) {
      console.error("SHOP SETTINGS LOAD ERROR:", error);
    }
  }

  loadShopSettings();
}, []);

  function applyPreset(type: "small" | "medium" | "large" | "fullDay") {
    
    if (professionType === "piercer") {
  if (type === "small") {
    setHours(0.25);
    setMaterials(35);
    setBoothRent(10);
  }

  if (type === "medium") {
    setHours(0.5);
    setMaterials(60);
    setBoothRent(15);
  }

  if (type === "large") {
    setHours(1);
    setMaterials(100);
    setBoothRent(25);
  }

  if (type === "fullDay") {
    setHours(2);
    setMaterials(180);
    setBoothRent(40);
  }

  return;
}
    
    setPricingMode("hourly");

    if (type === "small") {
      setHours(1);
      setMaterials(20);
      setBoothRent(25);
    }

    if (type === "medium") {
      setHours(3);
      setMaterials(35);
      setBoothRent(50);
    }

    if (type === "large") {
      setHours(6);
      setMaterials(60);
      setBoothRent(85);
    }

    if (type === "fullDay") {
      setHours(8);
      setMaterials(100);
      setBoothRent(125);
    }
  }

  function validateQuote() {
    if (!clientName || !clientEmail || !tattooDescription) {
      alert(
  `Please enter client name, email, and ${descriptionLabel.toLowerCase()}.`
);
      return false;
    }

    if (pricingMode === "hourly" && hours <= 0) {
      alert("Estimated hours must be greater than 0.");
      return false;
    }

    if (pricingMode === "hourly" && hourlyRate <= 0) {
      alert("Hourly rate must be greater than $0.");
      return false;
    }

    if (pricingMode === "piece" && piecePrice <= 0) {
      alert("Piece price must be greater than $0.");
      return false;
    }

    if (discountAmount > subtotalBeforeDiscount) {
      alert("Discount cannot be larger than the subtotal.");
      return false;
    }

    if (finalTotal <= 0) {
      alert("Total must be greater than $0.");
      return false;
    }

    return true;
  }

async function saveSettings() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    alert("You must be logged in to save settings.");
    return;
  }

  const { error } = await supabase.from("shop_settings").upsert(
    {
      user_id: user.id,
      shop_name: shopName,
      artist_name: artistName,
      artist_contact: artistContact,
      shop_email: shopEmail,
      send_shop_copy: sendShopCopy,
      state,
      city,
      pricing_mode: pricingMode,
      hourly_rate: hourlyRate,
      piece_price: piecePrice,
      materials,
      operating_model: operatingModel,
      booth_rent: boothRent,
      artist_percentage: artistPercentage,
      shop_percentage: shopPercentage,
      booth_rent_frequency: boothRentFrequency,
      weekly_booth_rent: weeklyBoothRent,
      monthly_booth_rent: monthlyBoothRent,
      appointments_per_week: appointmentsPerWeek,
      appointments_per_month: appointmentsPerMonth,
      build_expenses_into_quote: buildExpensesIntoQuote,
      apply_tax: applyTax,
      tax_rate: taxRate,
      booking_instructions: bookingInstructions,
      booking_link: bookingLink,
      deposit_required: depositRequired,
      deposit_percent: depositPercent,
      payment_instructions: paymentInstructions,
      deposit_due_hours: depositDueHours,
      apply_discount: applyDiscount,
      discount,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    alert(`Settings did not save: ${error.message}`);
    console.error("SHOP SETTINGS SAVE ERROR:", error);
    return;
  }

  alert("Settings saved!");
}

  async function saveQuote() {
    if (!validateQuote()) return;

    const { error } = await supabase.from("tattoo_quotes").insert({
      user_id: "demo-user",
      client_name: clientName,
      client_email: clientEmail,
      tattoo_description: `${serviceLabel} description`,
      estimated_hours: pricingMode === "hourly" ? hours : null,
      base_price: basePrice,
      material_cost: materials,
      tax_amount: taxAmount,
      total: finalTotal,
      status: "draft",
    });

    if (error) {
      alert(`${appointmentLabel} did not save.`);
      console.error(error);
      return;
    }

    alert(`${appointmentLabel} saved!`);
  }

async function sendQuoteEmail() {
  if (!validateQuote()) return;

  if (sendShopCopy && !shopEmail) {
    alert("Please enter a shop email or turn off shop email copy.");
    return;
  }

  try {
    // 1. Create or reuse quote link
let fullQuoteLink = quoteLink;

if (!fullQuoteLink) {
  const {
    data: { user: quoteOwner },
  } = await supabase.auth.getUser();

  const linkResponse = await fetch("/api/create-quote", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      authUserId: quoteOwner?.id || null,
      shopName,
      artistName,
      artistContact,
      shopEmail,
      clientName,
      clientEmail,
      tattooDescription,
      pricingMode,
      hours: pricingMode === "hourly" ? hours : null,
      total: finalTotal,
      discount: discountAmount,
      bookingLink,
      bookingInstructions,

      depositRequired,
      depositPercent,
      depositAmount,
      depositDueHours,
      paymentInstructions,
    }),
  });

  const linkText = await linkResponse.text();

  let linkData: any = {};

  try {
    linkData = JSON.parse(linkText);
  } catch {
    console.error("RAW RESPONSE FROM /api/create-quote:", linkText);
    alert("Quote link could not be created. Check your terminal.");
    return;
  }

  if (!linkResponse.ok) {
    console.error("QUOTE LINK ERROR:", linkData);
    alert("Quote link error: " + JSON.stringify(linkData));
    return;
  }

  if (!linkData.quoteUrl) {
    alert("Quote created but no link returned.");
    return;
  }

  const appBaseUrl = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://apa-compliance-system-y9th.vercel.app"
).replace(/\/$/, "");

fullQuoteLink = `${appBaseUrl}${linkData.quoteUrl}`;

setQuoteLink(fullQuoteLink);
}
if (fullQuoteLink.includes("localhost:3000")) {
  const appBaseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://apa-compliance-system-y9th.vercel.app"
  ).replace(/\/$/, "");

  const quotePath = fullQuoteLink.split("localhost:3000")[1] || "";

  fullQuoteLink = `${appBaseUrl}${quotePath}`;
  setQuoteLink(fullQuoteLink);
}
    // 2. Send email WITH link
    const emailResponse = await fetch("/api/send-quote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shopName,
        tattooerName: artistName,
        shopEmail,
        sendShopCopy,
        clientName,
        clientEmail,
        tattooDescription,
        pricingMode,
        hours: pricingMode === "hourly" ? hours : null,
        total: finalTotal.toFixed(2),

        quoteLink: fullQuoteLink,
        bookingLink,
        bookingInstructions,

        depositRequired,
        depositAmount,
        depositPercent,
        depositDueHours,
        paymentInstructions,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("EMAIL ERROR:", emailData);
      alert("Email failed: " + JSON.stringify(emailData));
      return;
    }

    alert(
  `${appointmentLabel} sent to ${clientName}. Email includes accept + booking.`
);
  } catch (error: any) {
    console.error("SEND FAILED:", error);
    alert("Send failed: " + (error?.message || JSON.stringify(error)));
  }
}

async function createQuoteLink() {
  if (!validateQuote()) return;

  setIsCreatingQuoteLink(true);

  try {
  const {
    data: { user: quoteOwner },
  } = await supabase.auth.getUser();

  const response = await fetch("/api/create-quote", {
    method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
 body: JSON.stringify({
  authUserId: quoteOwner?.id || null,
  shopName,
  artistName,
  artistContact,
    shopEmail,
    clientName,
    clientEmail,
    tattooDescription,
    pricingMode,
    hours: pricingMode === "hourly" ? hours : null,
    total: finalTotal,
    discount: discountAmount,
    bookingLink,

    depositRequired,
    depositPercent,
    depositAmount,
    depositDueHours,
    bookingInstructions,
  }),
});

    const text = await response.text();

    let data: any = {};

    try {
      data = JSON.parse(text);
    } catch {
      console.error("RAW RESPONSE FROM /api/create-quote:", text);
      alert("API did not return JSON. Check your VS Code terminal for the real error.");
      return;
    }

    if (!response.ok) {
      console.error("QUOTE CREATION API ERROR:", data);
      alert("API ERROR: " + JSON.stringify(data));
      return;
    }

    if (!data.quoteUrl) {
      console.error("Missing quoteUrl from API response:", data);
      alert(
  `${appointmentLabel} was created, but the API did not return a shareable link.`
);
      return;
    }

    const appBaseUrl = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://apa-compliance-system-y9th.vercel.app"
).replace(/\/$/, "");

const fullUrl = `${appBaseUrl}${data.quoteUrl}`;

    setQuoteLink(fullUrl);

    try {
      await navigator.clipboard.writeText(fullUrl);
      alert("Quote link copied! You can paste it into a text, email, or Instagram DM.");
    } catch (error) {
      console.error("Clipboard failed:", error);
      alert(
  `${appointmentLabel} link created, but your browser blocked auto-copy. Copy it from the link box.`
);
    }
  } catch (error: any) {
    console.error("FETCH FAILED WHILE CREATING QUOTE LINK:", error);
    alert("FETCH FAILED: " + (error?.message || JSON.stringify(error)));
  } finally {
    setIsCreatingQuoteLink(false);
  }
}

  async function copyExistingQuoteLink() {
    if (!quoteLink) return;

    try {
      await navigator.clipboard.writeText(quoteLink);
      alert(`${appointmentLabel} link copied again.`);
    } catch {
      alert("Copy failed. Please copy the link manually.");
    }
  }

  const inputStyle = {
    width: "100%",
    height: 48,
    padding: 14,
    borderRadius: 10,
    border: "1px solid #bbb",
    fontSize: 16,
    boxSizing: "border-box" as const,
    marginBottom: 14,
  };

  const cardStyle = {
    background: "#ffffff",
    color: "#111",
    padding: 28,
    borderRadius: 20,
    marginBottom: 24,
    border: "1px solid #e5e5e5",
    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
  };

  const primaryButtonStyle = {
    marginTop: 10,
    padding: "14px 18px",
    background: "linear-gradient(135deg,#ff5c00,#ff8a00)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontWeight: "bold" as const,
    cursor: "pointer",
  };

  const darkButtonStyle = {
    marginTop: 10,
    padding: "14px 18px",
    background: "#222b2b",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontWeight: "bold" as const,
    cursor: "pointer",
  };

  const smallButtonStyle = {
    padding: "10px 12px",
    background: "#f2f2f2",
    color: "#111",
    border: "1px solid #ccc",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold" as const,
  };

function InfoTip({ text }: { text: string }) {
  return (
    <span
      title={text}
      style={{
        marginLeft: 6,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 18,
        height: 18,
        borderRadius: "50%",
        background: "#ff5c00",
        color: "#fff",
        fontSize: 11,
        fontWeight: "bold",
        cursor: "help",
        verticalAlign: "middle",
      }}
    >
      ⓘ
    </span>
  );
}

  return (
    <div style={{ background: "#0f0f0f", minHeight: "100vh", padding: 24, fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: 950, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img
            src="/apa-logo.png"
            alt="Artist Protection Alliance"
            style={{ maxWidth: 420, width: "100%", height: "auto" }}
          />
          <h1 style={{ color: "#ff5c00", marginTop: 20 }}>Pricing & Client Quote Generator</h1>
          <p style={{ color: "#ddd" }}>
              Create accurate estimates, professional client quotes, and consistent pricing for artists, piercers, and studios.
          </p>
        </div>

        <div style={cardStyle}>
          <h2>Shop Info</h2>

          <label>Shop Name </label>
          <input style={inputStyle} value={shopName} onChange={(e) => setShopName(e.target.value)} />

          <label>
  {professionType === "piercer"
    ? "Piercer Name"
    : professionType === "shop"
    ? "Shop Rep Name"
    : "Tattoo Artist Name"}
</label>
          <input style={inputStyle} value={artistName} onChange={(e) => setArtistName(e.target.value)} />

<label>Shop Email</label>
<input
  style={inputStyle}
  type="email"
  value={shopEmail}
  onChange={(e) => setShopEmail(e.target.value)}
/>

<label>Primary Contact Info</label>
<input
  style={inputStyle}
  value={artistContact}
  onChange={(e) => setArtistContact(e.target.value)}
  placeholder="Instagram, phone number, email, or preferred contact"
/>

<label>Booking Link (Calendly, Google Calendar, etc.)</label>

<input
  style={inputStyle}
  value={bookingLink}
  onChange={(e) => setBookingLink(e.target.value)}
  placeholder="Paste your booking link"
/>

<label>Booking Instructions</label>
<textarea
  style={{ ...inputStyle, minHeight: 90 }}
  value={bookingInstructions}
  onChange={(e) => setBookingInstructions(e.target.value)}
  placeholder="Provide booking instructions. (Example: booking steps, deposit instructions, or scheduling details)"
/>

         
<label style={{ display: "block", marginTop: 12 }}>
  <input
    type="checkbox"
    checked={depositRequired}
    onChange={(e) => setDepositRequired(e.target.checked)}
  />{" "}
  Deposit required to complete booking
</label>

{depositRequired && (
  <>
    <label>Deposit Percentage (%)</label>
    <input
      style={inputStyle}
      type="number"
      value={depositPercent}
      onChange={(e) => setDepositPercent(Number(e.target.value))}
    />
<label>Deposit Due Before Booking</label>
<select
  style={inputStyle}
  value={depositDueHours}
  onChange={(e) => setDepositDueHours(Number(e.target.value))}
>
  <option value={12}>12 hours after booking</option>
  <option value={24}>24 hours after booking</option>
  <option value={48}>48 hours after booking</option>
</select>

    <p style={{ color: "#666", fontSize: 14 }}>
      Calculated Deposit: <strong>${depositAmount.toFixed(0)}</strong>
    </p>
    <p
  style={{
    color: "#aaa",
    fontSize: 13,
    lineHeight: 1.5,
    marginTop: 8,
  }}
>
  Deposits secure the appointment and are applied toward the final service total. Applicable taxes may be collected or adjusted at the time of service.
</p>

    <label>Payment Instructions</label>
    <textarea
      style={{ ...inputStyle, minHeight: 90 }}
      value={paymentInstructions}
      onChange={(e) => setPaymentInstructions(e.target.value)}
      placeholder="Example: Send deposit via Venmo @artistname"
    />
  </>
)}

          <label style={{ display: "block", marginTop: 12 }}>
            <input type="checkbox" checked={sendShopCopy} onChange={(e) => setSendShopCopy(e.target.checked)} /> Send shop a copy
          </label>
        </div>

        <div style={cardStyle}>
          <h2>Client Details</h2>

          <label>Client Name</label>
          <input style={inputStyle} value={clientName} onChange={(e) => setClientName(e.target.value)} />

          <label>Client Email</label>
          <input style={inputStyle} type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />

          <label>{descriptionLabel}</label>
          <textarea
            style={{ ...inputStyle, minHeight: 100 }}
            value={tattooDescription}
            onChange={(e) => setTattooDescription(e.target.value)}
          />
        </div>

        <div style={cardStyle}>
          <h2>Pricing Details</h2>

          <label>State</label>
          <select style={inputStyle} value={state} onChange={(e) => setState(e.target.value)}>
            {Object.entries(stateNames).map(([abbr, name]) => (
              <option key={abbr} value={abbr}>
                {name}
              </option>
            ))}
          </select>

          <label>City / Market</label>
          <select style={inputStyle} value={city} onChange={(e) => setCity(e.target.value)}>
            {cityOptions.map((cityName) => (
              <option key={cityName} value={cityName}>
                {cityName}
              </option>
            ))}
          </select>

          <p><strong>State average hourly rate:</strong> ${stateHourlyRates[state]}/hr</p>
          <p><strong>City-adjusted suggested rate:</strong> ${suggestedHourlyRate}/hr</p>
          <p style={{ color: "#666", fontSize: 14 }}>{marketPositionMessage}</p>

          <label>Override Hourly Rate</label>
          <input
            style={inputStyle}
            type="number"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(Number(e.target.value))}
          />

          <button onClick={() => setHourlyRate(suggestedHourlyRate)} style={{ ...smallButtonStyle, marginBottom: 16 }}>
            Reset to Suggested Rate (${suggestedHourlyRate})
          </button>

          <div style={{ marginBottom: 20 }}>
            <p><strong>Quick Pricing Presets</strong></p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button
  onClick={() => applyPreset("small")}
  style={smallButtonStyle}
>
  {presetLabels.small}
</button>

<button
  onClick={() => applyPreset("medium")}
  style={smallButtonStyle}
>
  {presetLabels.medium}
</button>

<button
  onClick={() => applyPreset("large")}
  style={smallButtonStyle}
>
  {presetLabels.large}
</button>

<button
  onClick={() => applyPreset("fullDay")}
  style={smallButtonStyle}
>
  {presetLabels.fullDay}
</button>
</div>
</div>

<label>Pricing Mode</label>
          <select style={inputStyle} value={pricingMode} onChange={(e) => setPricingMode(e.target.value as "hourly" | "piece")}>
            <option value="hourly">Hourly</option>
            <option value="piece">Flat Rate</option>
          </select>

          {pricingMode === "hourly" && (
            <>
              <label>Estimated Hours</label>
              <input style={inputStyle} type="number" value={hours} onChange={(e) => setHours(Number(e.target.value))} />
            </>
          )}

          {pricingMode === "piece" && (
            <>
              <label>Piece Price / Flat Rate</label>
              <input style={inputStyle} type="number" value={piecePrice} onChange={(e) => setPiecePrice(Number(e.target.value))} />
            </>
          )}

<label>
  Materials / Supplies (Per Appointment)
  <InfoTip text="Enter the estimated cost of supplies used specifically for this appointment, such as needles, gloves, barriers, ink, jewelry, disposables, or other service materials." />
</label>
<input
  style={inputStyle}
  type="number"
  value={materials}
  onChange={(e) => setMaterials(Number(e.target.value))}
/>

<label>Operating Model</label>
<select
  style={inputStyle}
  value={operatingModel}
  onChange={(e) =>
    setOperatingModel(
      e.target.value as "independent" | "booth_rent" | "percentage_split"
    )
  }
>
  <option value="independent">Independent Studio / Shop Owner</option>
  <option value="booth_rent">Booth Rent</option>
  <option value="percentage_split">Percentage Split</option>
</select>

<label style={{ display: "block", marginTop: 12 }}>
  <input
    type="checkbox"
    checked={buildExpensesIntoQuote}
    onChange={(e) =>
      setBuildExpensesIntoQuote(e.target.checked)
    }
  />{" "}
  Build Materials & Rent Into Client Quote
</label>

<p
  style={{
    color: "#666",
    fontSize: 13,
    marginTop: 4,
    marginBottom: 14,
  }}
>
When enabled, expenses are built into the client quote so your pricing reflects the true cost of doing business.
</p>

{operatingModel === "booth_rent" && (
  <>
    <label>Booth Rent Frequency</label>
    <select
      style={inputStyle}
      value={boothRentFrequency}
      onChange={(e) =>
        setBoothRentFrequency(
          e.target.value as "per_appointment" | "weekly" | "monthly"
        )
      }
    >
      <option value="per_appointment">Per Appointment</option>
      <option value="weekly">Weekly</option>
      <option value="monthly">Monthly</option>
    </select>

    {boothRentFrequency === "per_appointment" && (
      <>
        <label>
          Booth Rent Allocated To This Appointment
          <InfoTip text="Enter the portion of booth rent assigned to this appointment. Example: if monthly rent is $1,200 and you average 60 appointments per month, enter $20." />
        </label>
        <input
          style={inputStyle}
          type="number"
          value={boothRent}
          onChange={(e) => setBoothRent(Number(e.target.value))}
        />
      </>
    )}

    {boothRentFrequency === "weekly" && (
      <>
        <label>Weekly Booth Rent</label>
        <input
          style={inputStyle}
          type="number"
          value={weeklyBoothRent}
          onChange={(e) => setWeeklyBoothRent(Number(e.target.value))}
        />

        <label>Appointments Per Week</label>
        <input
          style={inputStyle}
          type="number"
          value={appointmentsPerWeek}
          onChange={(e) => setAppointmentsPerWeek(Number(e.target.value))}
        />
      </>
    )}

    {boothRentFrequency === "monthly" && (
      <>
        <label>Monthly Booth Rent</label>
        <input
          style={inputStyle}
          type="number"
          value={monthlyBoothRent}
          onChange={(e) => setMonthlyBoothRent(Number(e.target.value))}
        />

        <label>Appointments Per Month</label>
        <input
          style={inputStyle}
          type="number"
          value={appointmentsPerMonth}
          onChange={(e) => setAppointmentsPerMonth(Number(e.target.value))}
        />
      </>
    )}
  </>
)}
{operatingModel === "percentage_split" && (
  <>
    <label>Artist Percentage (%)</label>
    <input
      style={inputStyle}
      type="number"
      value={artistPercentage}
      onChange={(e) => {
        const value = Number(e.target.value);
        setArtistPercentage(value);
        setShopPercentage(100 - value);
      }}
    />

    <label>Shop Percentage (%)</label>
    <input
      style={inputStyle}
      type="number"
      value={shopPercentage}
      onChange={(e) => {
        const value = Number(e.target.value);
        setShopPercentage(value);
        setArtistPercentage(100 - value);
      }}
    />
  </>
)}
          <label style={{ display: "block", marginTop: 12 }}>
            <input type="checkbox" checked={applyTax} onChange={(e) => setApplyTax(e.target.checked)} /> Apply State Tax
          </label>

          {applyTax && (
            <>
              <label>Tax Rate (%)</label>
              <input style={inputStyle} type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
            </>
          )}

          <label style={{ display: "block", marginTop: 12 }}>
            <input type="checkbox" checked={applyDiscount} onChange={(e) => setApplyDiscount(e.target.checked)} /> Apply Discount
          </label>

          {applyDiscount && (
            <>
              <label>Discount Amount ($)</label>
              <input style={inputStyle} type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
            </>
          )}

          <AllianceGate
  allowed={isAllianceMember}
  title="Alliance Member Feature"
>
  <button onClick={saveSettings} style={darkButtonStyle}>
    Save Shop Settings
  </button>
</AllianceGate>
        </div>

<div
  style={{
    background: "linear-gradient(180deg,#1c1c1c,#121212)",
    color: "#f5f5f5",
    padding: 30,
    borderRadius: 24,
    boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
    border: "1px solid rgba(255,255,255,0.08)",
  }}
>
  <h2 style={{ color: "#ff5c00", marginTop: 0 }}>Pricing Breakdown</h2>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
      gap: 14,
      marginBottom: 22,
    }}
  >
    <div style={{ background: "#151515", padding: 16, borderRadius: 16 }}>
      <p><strong>State:</strong> {stateNames[state]}</p>
      <p><strong>City / Market:</strong> {city}</p>
      <p>
  <strong>Market Adjustment Multiplier:</strong>
  <InfoTip text="This adjusts the state average rate for the selected local market. A 1.15x multiplier means the selected market is estimated at 15% above the state average." />
  {" "}
  {cityMultiplier.toFixed(2)}x
</p>
   <p style={{ color: "#aaa", fontSize: 13, lineHeight: 1.5, marginTop: -6 }}>
 
</p>   <p style={{ color: "#aaa", fontSize: 13, lineHeight: 1.5 }}>
        
      </p>
    </div>

    <div style={{ background: "#151515", padding: 16, borderRadius: 16 }}>
      <p>
  <strong>Suggested Hourly Rate:</strong>
  <InfoTip text="Calculated using state average pricing and local market adjustments. You can override this recommendation at any time." />
  {" "}
  ${suggestedHourlyRate}/hr
</p>
     <p>
  <strong>Selected Hourly Rate Used:</strong>
  <InfoTip text="This is the hourly rate currently being used to calculate the estimate." />
  {" "}
  ${hourlyRate}/hr
</p>
      <p style={{ color: "#aaa", fontSize: 13, lineHeight: 1.5 }}>
        
      </p>
    </div>
  </div>

  <div
    style={{
      background: "#101010",
      padding: 20,
      borderRadius: 18,
      border: "1px solid rgba(255,255,255,0.08)",
    }}
  >
    <p><strong>Pricing Type:</strong> {pricingMode === "hourly" ? "Hourly" : "Flat Rate"}</p>
    {pricingMode === "hourly" && <p><strong>Hours:</strong> {hours}</p>}

    <p>
  <strong>Operating Model:</strong>{" "}
  {operatingModel === "independent"
    ? "Independent Studio / Shop Owner"
    : operatingModel === "booth_rent"
    ? "Booth Rent"
    : "Percentage Split"}
</p>

    <p>
      <strong>
        {professionType === "piercer"
          ? "Base Piercing Price"
          : "Base Artist Price"}
        :
      </strong>{" "}
      ${basePrice.toFixed(2)}
    </p>

    <p><strong>Materials / Supplies:</strong> ${materials.toFixed(2)}</p>

{operatingModel === "booth_rent" && (
  <p>
    <strong>Booth Rent Allocation:</strong>
    <InfoTip text="Represents a portion of rent, utilities, software, insurance, admin costs, supplies, and other business expenses allocated to this service." />
    {" "}
    ${overheadAllocation.toFixed(2)}
  </p>
)}

    <p><strong>Applied Discount:</strong> -${discountAmount.toFixed(2)}</p>
    <p><strong>Tax:</strong> ${taxAmount.toFixed(2)}</p>
  </div>

  <hr style={{ borderColor: "#333", margin: "24px 0" }} />

  {professionType !== "piercer" && (
    <div
      style={{
        background: "#151515",
        padding: 20,
        borderRadius: 18,
        border: "1px solid rgba(255,92,0,0.25)",
        marginBottom: 22,
      }}
    >
<p>
  <strong>Estimated Artist Earnings:</strong>
  <InfoTip text="Estimated take-home earnings based on the selected operating model." />
  {" "}
  ${artistEarnings.toFixed(2)}
</p>

{shopEarnings > 0 && (
  <p>
    <strong>Estimated Shop Earnings:</strong>
    <InfoTip text="Estimated earnings allocated to the shop through booth rent or percentage split." />
    {" "}
    ${shopEarnings.toFixed(2)}
  </p>
)}

      <p style={{ color: "#aaa", fontSize: 13, lineHeight: 1.5, marginTop: -6 }}>
        
      </p>

      <p>
        <strong>Estimated Margin:</strong>
<InfoTip text="The percentage of revenue remaining after estimated business expenses." />{" "}
        {profitMargin.toFixed(0)}%
      </p>

      <p style={{ color: "#aaa", fontSize: 13, lineHeight: 1.5, marginTop: -6 }}>
        
      </p>

      <p
        style={{
          color: confidenceColor,
          fontWeight: "bold",
          marginBottom: 0,
        }}
      >
        {confidenceMessage}
      </p>
    </div>
  )}

  <div
    style={{
      background: "#0f0f0f",
      padding: 22,
      borderRadius: 20,
      border: "1px solid rgba(255,255,255,0.08)",
      textAlign: "center",
      marginBottom: 24,
    }}
  >
    <p style={{ color: "#aaa", marginBottom: 6 }}>
      {professionType === "piercer"
        ? "Service Estimate Before Clean Rounding"
        : "Total Estimate Before Clean Rounding"}
    </p>

    <h2 style={{ marginTop: 0 }}>${total.toFixed(2)}</h2>

    <p style={{ color: "#aaa", marginBottom: 6 }}>
      {professionType === "piercer"
        ? "Estimated Piercing Total"
        : "Clean Client Estimate"}
    </p>

    <h1 style={{ color: "#ff5c00", marginTop: 0 }}>
      ${finalTotal.toFixed(0)}
    </h1>

    {finalTotal === minimumCharge && total < minimumCharge && (
      <p style={{ color: "#ff5c00" }}>
        Minimum service fee applied (${minimumCharge})
      </p>
    )}
  </div>

  <details
    style={{
      background: "#151515",
      borderRadius: 18,
      padding: 18,
      border: "1px solid rgba(255,255,255,0.08)",
      marginBottom: 24,
    }}
  >
    <summary
      style={{
        cursor: "pointer",
        color: "#ff5c00",
        fontWeight: "bold",
        fontSize: 16,
      }}
    >
      How are these calculations made?
    </summary>

    <div style={{ color: "#ccc", fontSize: 14, lineHeight: 1.7, marginTop: 16 }}>
      <p>
        <strong>Suggested hourly rate:</strong> State average hourly rate multiplied by the selected city or market adjustment.
      </p>

      <p>
        <strong>Base artist price:</strong>{" "}
        {pricingMode === "hourly"
          ? "Selected hourly rate multiplied by estimated hours."
          : "The flat rate entered for the service."}
      </p>

      <p>
        <strong>Subtotal:</strong> Base artist price plus applicable materials, overhead allocation, and any selected operating costs.
      </p>

      <p>
        <strong>Discount:</strong> Applied before tax when the discount option is turned on.
      </p>

      <p>
        <strong>Tax:</strong> Calculated only when “Apply State Tax” is turned on.
      </p>

      <p>
  <strong>Estimated earnings after expenses:</strong>
     Calculated from the client subtotal after discounts and taxes, then adjusted for materials, overhead allocation, booth rent, and any artist/shop percentage split. This provides a closer estimate of actual take-home revenue from the service.
</p>

      <p>
        <strong>Clean client estimate:</strong> The final client-facing estimate is rounded to a clean number for easier quoting.
      </p>
    </div>
  </details>

  <hr style={{ borderColor: "#333" }} />

  <h3 style={{ color: "#ff5c00" }}>
    Client {appointmentLabel} Preview
  </h3>

  <p><strong>Shop:</strong> {shopName || "Shop name"}</p>

  {artistContact && (
    <p><strong>Artist Contact:</strong> {artistContact}</p>
  )}

  {artistName && (
    <p>
      <strong>
        {professionType === "piercer"
          ? "Piercer"
          : professionType === "shop"
          ? "Representative"
          : "Artist"}
        :
      </strong>{" "}
      {artistName}
    </p>
  )}

  <p>
    <strong>{descriptionLabel}:</strong>{" "}
    {tattooDescription || `${serviceLabel} description`}
  </p>

  {pricingMode === "hourly" && (
    <p>
      <strong>Estimated {appointmentLabel} Hours:</strong> {hours}
    </p>
  )}

  <p>
    <strong>Estimated Total:</strong>{" "}
    ${finalTotal.toFixed(0)}
  </p>
<AllianceGate
  allowed={isAllianceMember}
  title="Professional Quote Tools"
  description={`Create professional client quotes, save estimates, and streamline bookings with Alliance membership.`}
>
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 14,
      marginTop: 8,
    }}
  >
    <button
      onClick={createQuoteLink}
      disabled={isCreatingQuoteLink}
      style={{
        ...darkButtonStyle,
        opacity: isCreatingQuoteLink ? 0.7 : 1,
        padding: "18px",
        borderRadius: 16,
        background: "#161616",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {isCreatingQuoteLink
        ? "Creating Quote..."
       : "Create Shareable Quote"}
    </button>

    <button
      onClick={sendQuoteEmail}
      style={{
        ...primaryButtonStyle,
        padding: "18px",
        borderRadius: 16,
      }}
    >
      Send Client Quote
    </button>
  </div>

  {quoteLink && (
    <div
      style={{
        marginTop: 22,
        padding: 22,
        borderRadius: 18,
        background: "#111111",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <p
        style={{
          marginTop: 0,
          marginBottom: 12,
          color: "#ff5c00",
          fontWeight: "bold",
          fontSize: 15,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        Shareable Client Quote
      </p>

      <input
        style={{
          width: "100%",
          padding: 14,
          borderRadius: 12,
          border: "1px solid #333",
          background: "#fff",
          color: "#111",
          boxSizing: "border-box",
          fontSize: 14,
        }}
        value={quoteLink}
        readOnly
      />

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 16,
        }}
      >
        <button
          onClick={copyExistingQuoteLink}
          style={{
            ...primaryButtonStyle,
            padding: "12px 16px",
          }}
        >
          Copy Link
        </button>

        <a
          href={quoteLink}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px 16px",
            background: "#1f1f1f",
            color: "#fff",
            borderRadius: 12,
            textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.08)",
            fontWeight: "bold",
          }}
        >
          Open Client Quote
        </a>
      </div>
    </div>
  )}
</AllianceGate>

</div>

            <p style={{ fontSize: 12, color: "#888", marginTop: 12 }}>
              Powered by Artist Protection Alliance
            </p>
          </div>
        </div>
  );
}