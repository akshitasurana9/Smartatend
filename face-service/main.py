
from fastapi import FastAPI, UploadFile, File, HTTPException
from deepface import DeepFace
import cv2
import numpy as np
import tempfile
import os
import traceback

app = FastAPI(title="SmartAttend Face Recognition API")

ALLOWED_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp"
}

MAX_SIZE = 5 * 1024 * 1024  # 5 MB


@app.get("/")
def home():
    return {
        "message": "SmartAttend Face Recognition API is running"
    }


@app.post("/verify-face")
async def verify_face(
    registered_photo: UploadFile = File(...),
    live_photo: UploadFile = File(...)
):
    registered_path = None
    live_path = None

    try:
        # Validate content types
        if (
            registered_photo.content_type not in ALLOWED_TYPES
            or live_photo.content_type not in ALLOWED_TYPES
        ):
            raise HTTPException(
                status_code=400,
                detail="Only JPG, PNG, and WEBP images are allowed."
            )

        # Read uploaded images
        registered_bytes = await registered_photo.read()
        live_bytes = await live_photo.read()

        if not registered_bytes or not live_bytes:
            raise HTTPException(
                status_code=400,
                detail="Both images must be provided."
            )

        if (
            len(registered_bytes) > MAX_SIZE
            or len(live_bytes) > MAX_SIZE
        ):
            raise HTTPException(
                status_code=413,
                detail="Each image must be smaller than 5 MB."
            )

        # Decode and validate images
        registered_image = cv2.imdecode(
            np.frombuffer(registered_bytes, dtype=np.uint8),
            cv2.IMREAD_COLOR
        )

        live_image = cv2.imdecode(
            np.frombuffer(live_bytes, dtype=np.uint8),
            cv2.IMREAD_COLOR
        )

        if registered_image is None or live_image is None:
            raise HTTPException(
                status_code=400,
                detail="One or both uploaded files are invalid images."
            )

        # Save images to temporary files
        with tempfile.NamedTemporaryFile(
            suffix=".jpg", delete=False
        ) as file:
            registered_path = file.name

        with tempfile.NamedTemporaryFile(
            suffix=".jpg", delete=False
        ) as file:
            live_path = file.name

        if not cv2.imwrite(registered_path, registered_image):
            raise RuntimeError("Could not save registered image.")

        if not cv2.imwrite(live_path, live_image):
            raise RuntimeError("Could not save live image.")

        print("\n========== FACE DIAGNOSTICS ==========")
        print("Registered image dimensions:", registered_image.shape)
        print("Live image dimensions:", live_image.shape)

        # Diagnostic: detect faces in both images
        registered_faces = DeepFace.extract_faces(
            img_path=registered_path,
            detector_backend="opencv",
            enforce_detection=True,
            align=True
        )

        live_faces = DeepFace.extract_faces(
            img_path=live_path,
            detector_backend="opencv",
            enforce_detection=True,
            align=True
        )

        print("Registered faces detected:", len(registered_faces))
        print("Live faces detected:", len(live_faces))

        # Compare registered and live faces
        result = DeepFace.verify(
            img1_path=registered_path,
            img2_path=live_path,
            model_name="Facenet512",
            detector_backend="opencv",
            distance_metric="cosine",
            enforce_detection=True,
            align=True
        )

        distance = float(result["distance"])
        threshold = float(result["threshold"])
        verified = bool(result["verified"])

        print("Face model: Facenet512")
        print("Distance metric: cosine")
        print("Face distance:", distance)
        print("Face threshold:", threshold)
        print("Face verified:", verified)
        print("=======================================\n")

        return {
            "verified": verified,
            "distance": distance,
            "threshold": threshold,
            "model": "Facenet512",
            "registered_faces_detected": len(registered_faces),
            "live_faces_detected": len(live_faces),
            "message": (
                "Face matched."
                if verified
                else "Face did not match."
            )
        }

    except HTTPException:
        raise

    except Exception as exc:
        print("========== FACE VERIFICATION ERROR ==========")
        traceback.print_exc()
        print("=============================================")

        raise HTTPException(
            status_code=422,
            detail=(
                f"Face verification error: "
                f"{type(exc).__name__}: {exc}"
            )
        )

    finally:
        # Remove temporary files
        for path in (registered_path, live_path):
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except OSError as cleanup_error:
                    print(
                        "Temporary file cleanup failed:",
                        cleanup_error
                    )

        await registered_photo.close()
        await live_photo.close()
