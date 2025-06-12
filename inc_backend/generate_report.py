import json
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Table, TableStyle
from reportlab.lib import colors


# Load report data from JSON
with open("report_data.json", "r") as file:
    report_data = json.load(file)


def generate_report(output_pdf):
    """Generate a PDF report with patient, doctor, and Grad-CAM information."""


    # Extract data
    doctor = report_data["doctor"]
    patient = report_data["patient"]
    prediction_result = report_data["prediction"]
    confidence = report_data["confidence"]
    grad_cam_colored_url= report_data["grad_cam_colored"]
    abnormal_regions_url = report_data["abnormal_regions"]


    # Create PDF
    c = canvas.Canvas(output_pdf, pagesize=letter)
    width, height = letter


    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width / 2, height - 50, "Acute Lymphoblastic Leukemia (ALL) Detection Report")


    # Doctor Information
    doctor_table = Table([
        ["Doctor Name:", doctor["name"]],
        ["Specialty:", doctor["specialty"]],
        ["Phone Number:", doctor["phone"]],
        ["Hospital:", doctor["hospital"]]
    ], colWidths=[180, 220])


    # Patient Information
    patient_table = Table([
        ["Patient Name:", patient["name"]],
        ["Patient ID:", patient["id"]],
        ["Age:", str(patient["age"])],
        ["Gender:", patient["gender"]],
        ["Blood Group:", patient["bloodGroup"]],
        ["Phone Number:", patient["phone"]],
        ["Referring Physician:", patient["referringPhysician"]]
    ], colWidths=[180, 220])


    # Prediction Result
    result_table = Table([
        ["Prediction Result:", prediction_result],
        ["Confidence Score:", f"{confidence:.2%}" if isinstance(confidence, float) else confidence]
    ], colWidths=[180, 220])

    # Table Styling
    style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica')
    ])


    doctor_table.setStyle(style)
    patient_table.setStyle(style)
    result_table.setStyle(style)


    # Draw tables
    doctor_table.wrapOn(c, width, height)
    doctor_table.drawOn(c, 100, height - 180)


    patient_table.wrapOn(c, width, height)
    patient_table.drawOn(c, 100, height - 350)


    result_table.wrapOn(c, width, height)
    result_table.drawOn(c, 100, height - 420)


    # Insert images
    img_width = 150
    img_height = 150
    y_pos = height - 650

    


# Reset font for labels

    c.setFont("Helvetica-Bold", 12)

# Draw labels
    c.drawString(100, y_pos + img_height + 10, "Grad-CAM")
    c.drawString(300, y_pos + img_height + 10, "Highlighted Abnormal Regions")
    c.drawImage(ImageReader(grad_cam_colored_url), 100, y_pos, width=img_width, height=img_height)
    c.drawImage(ImageReader(abnormal_regions_url), 300, y_pos, width=img_width, height=img_height)


    # Save PDF
    c.showPage()
    c.save()
    print(f"Report saved as {output_pdf}")


# Generate the report
generate_report("ALL_Detection_Report.pdf")